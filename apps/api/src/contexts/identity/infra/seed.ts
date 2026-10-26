import { db } from '../../../db';
import { demoCompany, demoMembership, demoUser } from '../domain/demo';
import { companies, memberships, users } from './schema';

export async function seedDemo(): Promise<void> {
  await db.insert(companies).values(demoCompany).onConflictDoNothing();
  await db.insert(users).values(demoUser).onConflictDoNothing();
  await db.insert(memberships).values(demoMembership).onConflictDoNothing();
}
