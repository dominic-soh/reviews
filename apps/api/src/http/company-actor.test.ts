import { describe, expect, test } from 'bun:test';
import { companyActorSchema } from '@reviews/contracts';
import { eq } from 'drizzle-orm';
import { demoMembership } from '../contexts/identity/domain/demo';
import { member, session, user } from '../contexts/identity/infra/auth-schema';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { seedDemo } from '../contexts/identity/infra/seed';
import { db } from '../db';
import { migrateDatabase } from '../migrate';
import { app } from './app';

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((cookie) => cookie.length > 0)
    .join('; ');
}

async function signIn(email: string): Promise<string> {
  let magicUrl = '';
  setMagicLinkDelivery(async (_email, url) => {
    magicUrl = url;
  });
  const started = await app.request(
    'http://127.0.0.1:3001/api/auth/sign-in/magic-link',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://127.0.0.1:3001',
      },
      body: JSON.stringify({ email }),
    },
  );
  expect(started.status).toBe(200);
  const verified = await app.request(magicUrl, { redirect: 'manual' });
  return cookieHeader(verified);
}

function authed(cookie: string, method: string, path: string, body?: unknown) {
  return app.request(`http://127.0.0.1:3001${path}`, {
    method,
    headers: {
      cookie,
      'content-type': 'application/json',
      origin: 'http://127.0.0.1:3001',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function clearActiveOrganization(email: string): Promise<void> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  const authUser = rows[0];
  if (!authUser) {
    throw new Error(`no auth user for ${email}`);
  }
  await db
    .update(session)
    .set({ activeOrganizationId: null })
    .where(eq(session.userId, authUser.id));
}

async function reinsertMemberLast(
  membershipId: string,
  createdAt: Date,
): Promise<void> {
  const rows = await db
    .select()
    .from(member)
    .where(eq(member.id, membershipId));
  const row = rows[0];
  if (!row) {
    throw new Error('member missing');
  }
  await db.delete(member).where(eq(member.id, row.id));
  await db.insert(member).values({ ...row, createdAt });
}

describe('company actor', () => {
  test('a magic link sign-in returns the demo membership', async () => {
    await migrateDatabase();
    await seedDemo();

    let magicUrl = '';
    setMagicLinkDelivery(async (_email, url) => {
      magicUrl = url;
    });

    const signIn = await app.request(
      'http://127.0.0.1:3001/api/auth/sign-in/magic-link',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://127.0.0.1:3001',
        },
        body: JSON.stringify({ email: 'ada@demo.test' }),
      },
    );
    expect(signIn.status).toBe(200);
    expect(magicUrl.length).toBeGreaterThan(0);

    const verified = await app.request(magicUrl, { redirect: 'manual' });
    const actorResponse = await app.request(
      'http://127.0.0.1:3001/company-actor',
      {
        headers: { cookie: cookieHeader(verified) },
      },
    );

    expect(actorResponse.status).toBe(200);
    const actor = companyActorSchema.parse(await actorResponse.json());
    expect(actor.role).toBe('owner');
    expect(actor.companyName).toBe('Demo');
    expect(actor.slug).toBe('demo');
    expect(`${actor.membershipId}`).toBe(demoMembership.id);
    expect(`${actor.companyId}`).toBe(demoMembership.companyId);
  });

  test('a user with no active organization gets their oldest company', async () => {
    await migrateDatabase();
    const tag = crypto.randomUUID().slice(0, 8);
    const email = `founder-${tag}@actor.test`;
    const cookie = await signIn(email);

    const createdA = await authed(cookie, 'POST', '/companies', {
      name: 'Company A',
      slug: `company-a-${tag}`,
    });
    expect(createdA.status).toBe(200);
    const companyA = companyActorSchema.parse(await createdA.json());

    const createdB = await authed(cookie, 'POST', '/companies', {
      name: 'Company B',
      slug: `company-b-${tag}`,
    });
    expect(createdB.status).toBe(200);
    const companyB = companyActorSchema.parse(await createdB.json());
    expect(companyB.slug).toBe(`company-b-${tag}`);

    await reinsertMemberLast(
      `${companyA.membershipId}`,
      new Date('2020-01-01T00:00:00.000Z'),
    );
    await clearActiveOrganization(email);

    const slugs: string[] = [];
    while (slugs.length < 5) {
      const response = await authed(cookie, 'GET', '/company-actor');
      expect(response.status).toBe(200);
      slugs.push(companyActorSchema.parse(await response.json()).slug);
    }
    expect(slugs).toEqual([
      companyA.slug,
      companyA.slug,
      companyA.slug,
      companyA.slug,
      companyA.slug,
    ]);
  });
});
