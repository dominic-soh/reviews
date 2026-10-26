import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { type CompanyActor, membershipRole } from '../domain/company-actor';
import { member } from '../infra/auth-schema';
import { memberships } from '../infra/schema';

export async function companyActorForAuthUser(
  authUserId: string,
): Promise<CompanyActor | null> {
  const members = await db
    .select()
    .from(member)
    .where(eq(member.userId, authUserId));
  const authMember = members[0];
  if (!authMember) {
    return null;
  }

  const rows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, authMember.id));
  const membership = rows[0];
  if (!membership || membership.companyId !== authMember.organizationId) {
    return null;
  }

  return {
    membershipId: membership.id,
    companyId: membership.companyId,
    role: membershipRole(authMember.role),
  };
}
