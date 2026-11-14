import { createHmac, randomInt } from 'node:crypto';
import { and, eq, gt, gte, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../../../db';
import type { CompanyActor } from '../domain/company-actor';
import { authSecret } from '../infra/auth';
import { user } from '../infra/auth-schema';
import { sendSignInCode } from '../infra/mail';
import {
  type IssuedSession,
  issuePersonalSession,
} from '../infra/personal-session';
import { memberships, personalSignIns, users } from '../infra/schema';
import { type CommandResult, commandError } from './result';

const quarterHour = 15 * 60 * 1000;
const maxAttempts = 5;

function hashCode(code: string): string {
  return createHmac('sha256', authSecret).update(code).digest('hex');
}

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

export async function requestPersonalCode(email: string): Promise<void> {
  const people = await db
    .select()
    .from(users)
    .where(eq(users.personalEmail, email));
  const person = people[0];
  if (!person) {
    return;
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const pending = {
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + quarterHour),
    attempts: 0,
  };
  await db
    .insert(personalSignIns)
    .values({ userId: person.id, ...pending })
    .onConflictDoUpdate({ target: personalSignIns.userId, set: pending });
  await sendSignInCode(email, code);
}

async function consumeCode(userId: string, code: string): Promise<boolean> {
  const now = new Date();
  const consumed = await db
    .delete(personalSignIns)
    .where(
      and(
        eq(personalSignIns.userId, userId),
        eq(personalSignIns.codeHash, hashCode(code)),
        gt(personalSignIns.expiresAt, now),
        lt(personalSignIns.attempts, maxAttempts),
      ),
    )
    .returning({ userId: personalSignIns.userId });
  if (consumed.length > 0) {
    return true;
  }
  await db
    .update(personalSignIns)
    .set({ attempts: sql`${personalSignIns.attempts} + 1` })
    .where(eq(personalSignIns.userId, userId));
  await db
    .delete(personalSignIns)
    .where(
      and(
        eq(personalSignIns.userId, userId),
        or(
          gte(personalSignIns.attempts, maxAttempts),
          lte(personalSignIns.expiresAt, now),
        ),
      ),
    );
  return false;
}

export async function verifyPersonalCode(
  email: string,
  code: string,
): Promise<CommandResult<{ userId: string; session: IssuedSession }>> {
  const people = await db
    .select()
    .from(users)
    .where(eq(users.personalEmail, email));
  const person = people[0];
  if (!person) {
    return commandError('invalid');
  }
  if (!(await consumeCode(person.id, code))) {
    return commandError('invalid');
  }

  const accounts = await db
    .select()
    .from(user)
    .where(eq(user.email, person.email));
  const account = accounts[0];
  if (!account) {
    return commandError('not-found');
  }
  return {
    ok: true,
    value: {
      userId: person.id,
      session: await issuePersonalSession(account.id),
    },
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
