import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { type CompanyActor, membershipRole } from '../domain/company-actor';
import { member } from '../infra/auth-schema';
import { agentTokens, companies, memberships } from '../infra/schema';

export async function companyActorForMembership(
  membershipId: string,
): Promise<CompanyActor | null> {
  const rows = await db
    .select({
      id: memberships.id,
      companyId: memberships.companyId,
      companyName: companies.name,
      slug: companies.slug,
    })
    .from(memberships)
    .innerJoin(companies, eq(companies.id, memberships.companyId))
    .where(eq(memberships.id, membershipId));
  const membership = rows[0];
  if (!membership) {
    return null;
  }

  const members = await db
    .select()
    .from(member)
    .where(eq(member.id, membership.id));
  const authMember = members[0];
  if (!authMember || authMember.organizationId !== membership.companyId) {
    return null;
  }

  return {
    membershipId: membership.id,
    companyId: membership.companyId,
    role: membershipRole(authMember.role),
    companyName: membership.companyName,
    slug: membership.slug,
  };
}

export async function companyActorForAuthUser(
  authUserId: string,
  organizationId?: string | null,
): Promise<CompanyActor | null> {
  const members = await db
    .select()
    .from(member)
    .where(
      organizationId
        ? and(
            eq(member.userId, authUserId),
            eq(member.organizationId, organizationId),
          )
        : eq(member.userId, authUserId),
    );
  const authMember = members[0];
  if (!authMember) {
    return null;
  }
  return companyActorForMembership(authMember.id);
}

export async function companyActorForAgentToken(
  token: string,
): Promise<CompanyActor | null> {
  const tokens = await db
    .select()
    .from(agentTokens)
    .where(eq(agentTokens.token, token));
  const row = tokens[0];
  if (!row) {
    return null;
  }
  return companyActorForMembership(row.membershipId);
}
