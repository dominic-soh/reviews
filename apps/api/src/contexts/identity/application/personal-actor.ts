import { eq, or } from 'drizzle-orm';
import { db } from '../../../db';
import type { CompanyActor } from '../domain/company-actor';
import { session, user } from '../infra/auth-schema';
import { sendMagicLink } from '../infra/mail';
import { memberships, personalSignIns, users } from '../infra/schema';
import { sessionCookie } from '../infra/session-cookie';
import { type CommandResult, commandError } from './result';

const quarterHour = 15 * 60 * 1000;
const week = 7 * 24 * 60 * 60 * 1000;

export async function linkPersonalEmail(
  actor: CompanyActor,
  email: string,
): Promise<CommandResult<{ email: string }>> {
  const membershipRows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, actor.membershipId));
  const membership = membershipRows[0];
  if (!membership) {
    return commandError('not-found');
  }

  const taken = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.personalEmail, email)));
  const conflict = taken.find((row) => row.id !== membership.userId);
  if (conflict) {
    return commandError('conflict');
  }
  const self = taken.find((row) => row.id === membership.userId);
  if (self?.email === email) {
    return commandError('invalid');
  }

  await db
    .update(users)
    .set({ personalEmail: email })
    .where(eq(users.id, membership.userId));
  return { ok: true, value: { email } };
}

export async function requestPersonalLink(email: string): Promise<void> {
  const people = await db
    .select()
    .from(users)
    .where(eq(users.personalEmail, email));
  const person = people[0];
  if (!person) {
    return;
  }
  const token = crypto.randomUUID();
  await db.insert(personalSignIns).values({
    token,
    userId: person.id,
    expiresAt: new Date(Date.now() + quarterHour),
  });
  const base = process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3001';
  await sendMagicLink(email, `${base}/sign-in/personal/verify?token=${token}`);
}

export async function verifyPersonalLink(
  token: string,
): Promise<CommandResult<{ cookie: string; userId: string }>> {
  const pendingRows = await db
    .select()
    .from(personalSignIns)
    .where(eq(personalSignIns.token, token));
  const pending = pendingRows[0];
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    return commandError('not-found');
  }
  await db.delete(personalSignIns).where(eq(personalSignIns.token, token));

  const people = await db
    .select()
    .from(users)
    .where(eq(users.id, pending.userId));
  const person = people[0];
  if (!person) {
    return commandError('not-found');
  }
  const accounts = await db
    .select()
    .from(user)
    .where(eq(user.email, person.email));
  const account = accounts[0];
  if (!account) {
    return commandError('not-found');
  }

  const now = new Date();
  const sessionToken = crypto.randomUUID().replaceAll('-', '');
  await db.insert(session).values({
    id: `session_${crypto.randomUUID()}`,
    expiresAt: new Date(now.getTime() + week),
    token: sessionToken,
    createdAt: now,
    updatedAt: now,
    userId: account.id,
    loginKind: 'personal',
  });
  return {
    ok: true,
    value: { cookie: await sessionCookie(sessionToken), userId: person.id },
  };
}

export async function personalActorFor(
  authUserId: string,
): Promise<{ userId: string } | null> {
  const accounts = await db.select().from(user).where(eq(user.id, authUserId));
  const account = accounts[0];
  if (!account) {
    return null;
  }
  const people = await db
    .select()
    .from(users)
    .where(eq(users.email, account.email));
  const person = people[0];
  if (!person?.personalEmail) {
    return null;
  }
  return { userId: person.id };
}
