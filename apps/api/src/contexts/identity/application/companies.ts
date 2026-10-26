import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { canInvite, canSetManager, canSetRole } from '../domain/access';
import type { CompanyActor } from '../domain/company-actor';
import { membershipRole } from '../domain/company-actor';
import { managerCreatesCycle } from '../domain/reporting';
import {
  invitation,
  member,
  organization,
  session,
} from '../infra/auth-schema';
import { companies, memberships, reportingLines, users } from '../infra/schema';
import { asAppRole } from '../infra/tenant';
import { type CommandResult, commandError } from './result';

type InvitableRole = 'admin' | 'member';

type Invitation = {
  id: string;
  email: string;
  role: InvitableRole;
  status: 'pending';
};

type MemberRow = {
  membershipId: string;
  name: string;
  email: string;
  role: CompanyActor['role'];
  managerMembershipId: string | null;
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function domainUserId(email: string, name: string): Promise<string> {
  const existing = await db.select().from(users).where(eq(users.email, email));
  const found = existing[0];
  if (found) {
    return found.id;
  }
  const id = newId('user');
  await db.insert(users).values({ id, email, name });
  return id;
}

export async function createCompany(input: {
  authUserId: string;
  email: string;
  name: string;
  companyName: string;
  slug: string;
}): Promise<CommandResult<CompanyActor>> {
  const taken = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, input.slug));
  if (taken[0]) {
    return commandError('conflict');
  }

  const domainUser = await domainUserId(input.email, input.name);
  const companyId = newId('company');
  const membershipId = newId('membership');
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(companies).values({
      id: companyId,
      name: input.companyName,
      slug: input.slug,
    });
    await tx.insert(organization).values({
      id: companyId,
      name: input.companyName,
      slug: input.slug,
      createdAt: now,
    });
    await tx.insert(memberships).values({
      id: membershipId,
      companyId,
      userId: domainUser,
      role: 'owner',
    });
    await tx.insert(member).values({
      id: membershipId,
      organizationId: companyId,
      userId: input.authUserId,
      role: 'owner',
      createdAt: now,
    });
    await tx
      .update(session)
      .set({ activeOrganizationId: companyId, updatedAt: now })
      .where(eq(session.userId, input.authUserId));
  });

  return {
    ok: true,
    value: { membershipId, companyId, role: 'owner' },
  };
}

export async function inviteMember(
  actor: CompanyActor,
  authUserId: string,
  input: { email: string; role: InvitableRole },
): Promise<CommandResult<Invitation>> {
  if (!canInvite(actor.role)) {
    return commandError('forbidden');
  }

  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email));
  const existingUser = existingUsers[0];
  if (existingUser) {
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.companyId, actor.companyId),
          eq(memberships.userId, existingUser.id),
        ),
      );
    if (existingMembership[0]) {
      return commandError('conflict');
    }
  }

  const pending = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, actor.companyId),
        eq(invitation.email, input.email),
        eq(invitation.status, 'pending'),
      ),
    );
  if (pending[0]) {
    return commandError('conflict');
  }

  const id = newId('invitation');
  const now = new Date();
  await db.insert(invitation).values({
    id,
    organizationId: actor.companyId,
    email: input.email,
    role: input.role,
    status: 'pending',
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    inviterId: authUserId,
  });

  return {
    ok: true,
    value: { id, email: input.email, role: input.role, status: 'pending' },
  };
}

function invitedRole(role: string | null): InvitableRole | null {
  switch (role) {
    case 'admin':
    case 'member':
      return role;
    default:
      return null;
  }
}

export async function acceptInvite(input: {
  authUserId: string;
  email: string;
  name: string;
  invitationId: string;
}): Promise<CommandResult<CompanyActor>> {
  const rows = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, input.invitationId));
  const pending = rows[0];
  if (pending?.status !== 'pending') {
    return commandError('not-found');
  }
  if (pending.email !== input.email) {
    return commandError('forbidden');
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    return commandError('invalid');
  }
  const role = invitedRole(pending.role);
  if (!role) {
    return commandError('invalid');
  }

  const domainUser = await domainUserId(input.email, input.name);
  const membershipId = newId('membership');
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({
      id: membershipId,
      companyId: pending.organizationId,
      userId: domainUser,
      role,
    });
    await tx.insert(member).values({
      id: membershipId,
      organizationId: pending.organizationId,
      userId: input.authUserId,
      role,
      createdAt: now,
    });
    await tx
      .update(invitation)
      .set({ status: 'accepted' })
      .where(eq(invitation.id, pending.id));
    await tx
      .update(session)
      .set({ activeOrganizationId: pending.organizationId, updatedAt: now })
      .where(eq(session.userId, input.authUserId));
  });

  return {
    ok: true,
    value: {
      membershipId,
      companyId: pending.organizationId,
      role,
    },
  };
}

export async function setMembershipRole(
  actor: CompanyActor,
  membershipId: string,
  role: InvitableRole,
): Promise<CommandResult<{ membershipId: string; role: InvitableRole }>> {
  if (!canSetRole(actor.role)) {
    return commandError('forbidden');
  }
  const rows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId));
  const membership = rows[0];
  if (!membership || membership.companyId !== actor.companyId) {
    return commandError('not-found');
  }
  if (membership.role === 'owner') {
    return commandError('forbidden');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, membershipId));
    await tx.update(member).set({ role }).where(eq(member.id, membershipId));
  });

  return { ok: true, value: { membershipId, role } };
}

export async function setManager(
  actor: CompanyActor,
  membershipId: string,
  managerMembershipId: string | null,
): Promise<CommandResult<{ managerMembershipId: string | null }>> {
  if (!canSetManager(actor.role)) {
    return commandError('forbidden');
  }

  const rows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.companyId, actor.companyId));
  const membership = rows.find((row) => row.id === membershipId);
  if (!membership) {
    return commandError('not-found');
  }

  if (!managerMembershipId) {
    await db
      .delete(reportingLines)
      .where(eq(reportingLines.membershipId, membershipId));
    return { ok: true, value: { managerMembershipId: null } };
  }

  const manager = rows.find((row) => row.id === managerMembershipId);
  if (!manager) {
    return commandError('not-found');
  }

  const lines = await db
    .select()
    .from(reportingLines)
    .where(eq(reportingLines.companyId, actor.companyId));
  const withoutCurrent = lines.filter(
    (line) => line.membershipId !== membershipId,
  );
  if (managerCreatesCycle(withoutCurrent, membershipId, managerMembershipId)) {
    return commandError('invalid');
  }

  await db
    .insert(reportingLines)
    .values({
      membershipId,
      managerMembershipId,
      companyId: actor.companyId,
    })
    .onConflictDoUpdate({
      target: reportingLines.membershipId,
      set: { managerMembershipId },
    });

  return { ok: true, value: { managerMembershipId } };
}

export async function listMembers(actor: CompanyActor): Promise<MemberRow[]> {
  return asAppRole(actor.companyId, async (tx) => {
    const rows = await tx
      .select({
        membershipId: memberships.id,
        name: users.name,
        email: users.email,
        role: memberships.role,
        managerMembershipId: reportingLines.managerMembershipId,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .leftJoin(reportingLines, eq(reportingLines.membershipId, memberships.id))
      .where(eq(memberships.companyId, actor.companyId));

    return rows.map((row) => ({
      membershipId: row.membershipId,
      name: row.name,
      email: row.email,
      role: membershipRole(row.role),
      managerMembershipId: row.managerMembershipId,
    }));
  });
}
