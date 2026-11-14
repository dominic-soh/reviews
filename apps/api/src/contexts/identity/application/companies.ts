import { and, eq } from 'drizzle-orm';
import { db, isUniqueViolation } from '../../../db';
import { canInvite, canSetManager, canSetRole } from '../domain/access';
import type { CompanyActor } from '../domain/company-actor';
import { membershipRole } from '../domain/company-actor';
import { managerCreatesCycle } from '../domain/reporting';
import {
  invitation,
  member,
  organization,
  session,
  user,
} from '../infra/auth-schema';
import { sendInvite } from '../infra/mail';
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
  await db
    .insert(users)
    .values({ id: newId('user'), email, name })
    .onConflictDoNothing({ target: users.email });
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  const found = rows[0];
  if (!found) {
    throw new Error(`domain user for ${email} vanished after upsert`);
  }
  return found.id;
}

export async function createCompany(input: {
  authUserId: string;
  email: string;
  name: string;
  companyName: string;
  slug: string;
}): Promise<CommandResult<CompanyActor>> {
  const domainUser = await domainUserId(input.email, input.name);
  const companyId = newId('company');
  const membershipId = newId('membership');
  const now = new Date();

  try {
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
  } catch (error) {
    if (isUniqueViolation(error)) {
      return commandError('conflict');
    }
    throw error;
  }

  return {
    ok: true,
    value: {
      membershipId,
      companyId,
      role: 'owner',
      companyName: input.companyName,
      slug: input.slug,
    },
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

  const companyRows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, actor.companyId));
  const company = companyRows[0];
  if (!company) {
    return commandError('not-found');
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
      return commandError('conflict', 'member');
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
    return commandError('conflict', 'invited');
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

  const inviterRows = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, authUserId));
  const inviterName = inviterRows[0]?.name || undefined;

  try {
    await sendInvite(input.email, company.name, inviterName);
  } catch (error) {
    await db.delete(invitation).where(eq(invitation.id, id));
    throw error;
  }

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

  const companyRows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, pending.organizationId));
  const company = companyRows[0];
  if (!company) {
    return commandError('not-found');
  }

  const domainUser = await domainUserId(input.email, input.name);
  const membershipId = newId('membership');
  const now = new Date();

  try {
    return await db.transaction(
      async (tx): Promise<CommandResult<CompanyActor>> => {
        const existing = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.companyId, pending.organizationId),
              eq(memberships.userId, domainUser),
            ),
          );
        const alreadyMember = existing.length > 0;
        const claimed = await tx
          .update(invitation)
          .set({ status: alreadyMember ? 'canceled' : 'accepted' })
          .where(
            and(
              eq(invitation.id, pending.id),
              eq(invitation.status, 'pending'),
            ),
          )
          .returning({ id: invitation.id });
        if (claimed.length === 0) {
          return commandError('not-found');
        }
        if (alreadyMember) {
          return commandError('conflict', 'member');
        }

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
          .update(session)
          .set({ activeOrganizationId: pending.organizationId, updatedAt: now })
          .where(eq(session.userId, input.authUserId));

        return {
          ok: true,
          value: {
            membershipId,
            companyId: pending.organizationId,
            role,
            companyName: company.name,
            slug: company.slug,
          },
        };
      },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return commandError('conflict', 'member');
    }
    throw error;
  }
}

type PendingInviteRow = {
  id: string;
  email: string;
  role: string | null;
  expiresAt: Date;
  companyName?: string;
};

function openInvitation(row: PendingInviteRow): Invitation | null {
  if (row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  const role = invitedRole(row.role);
  if (!role) {
    return null;
  }
  return { id: row.id, email: row.email, role, status: 'pending' };
}

export async function listPendingInvites(
  actor: CompanyActor,
): Promise<CommandResult<Invitation[]>> {
  if (!canInvite(actor.role)) {
    return commandError('forbidden');
  }
  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, actor.companyId),
        eq(invitation.status, 'pending'),
      ),
    );
  const invites: Invitation[] = [];
  for (const row of rows) {
    const open = openInvitation(row);
    if (open) {
      invites.push(open);
    }
  }
  return { ok: true, value: invites };
}

export type MyInvitation = Invitation & { companyName: string };

export async function listMyInvites(email: string): Promise<MyInvitation[]> {
  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      companyName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(and(eq(invitation.email, email), eq(invitation.status, 'pending')));
  const invites: MyInvitation[] = [];
  for (const row of rows) {
    const open = openInvitation(row);
    if (open) {
      invites.push({ ...open, companyName: row.companyName });
    }
  }
  return invites;
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
