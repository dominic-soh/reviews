import { db } from '../../../db';
import {
  demoAuthMember,
  demoAuthUser,
  demoCompany,
  demoMembership,
  demoOrganization,
  demoUser,
} from '../domain/demo';
import { member, organization, user } from './auth-schema';
import { companies, memberships, users } from './schema';

export async function seedDemo(): Promise<void> {
  await db.insert(companies).values(demoCompany).onConflictDoNothing();
  await db.insert(users).values(demoUser).onConflictDoNothing();
  await db.insert(memberships).values(demoMembership).onConflictDoNothing();
  await db.insert(user).values(demoAuthUser).onConflictDoNothing();
  await db.insert(organization).values(demoOrganization).onConflictDoNothing();
  await db.insert(member).values(demoAuthMember).onConflictDoNothing();
}
