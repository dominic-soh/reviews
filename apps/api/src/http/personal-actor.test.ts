import { describe, expect, test } from 'bun:test';
import { personalActorSchema } from '@reviews/contracts';
import { demoUser } from '../contexts/identity/domain/demo';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { seedDemo } from '../contexts/identity/infra/seed';
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

const personalEmail = 'ada.personal@demo.test';

async function signInPersonal(company: string): Promise<string> {
  const linked = await authed(company, 'POST', '/me/personal-email', {
    email: personalEmail,
  });
  expect(linked.status).toBe(200);

  let magicUrl = '';
  setMagicLinkDelivery(async (_email, url) => {
    magicUrl = url;
  });
  const started = await app.request('http://127.0.0.1:3001/sign-in/personal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: personalEmail }),
  });
  expect(started.status).toBe(200);
  expect(magicUrl.length).toBeGreaterThan(0);

  const verified = await app.request(magicUrl);
  expect(verified.status).toBe(200);
  return cookieHeader(verified);
}

const missingId = crypto.randomUUID();

const companyRoutes: { method: string; path: string; body?: unknown }[] = [
  { method: 'GET', path: '/company-actor' },
  { method: 'GET', path: '/members' },
  { method: 'GET', path: '/invites' },
  {
    method: 'POST',
    path: '/invites',
    body: { email: 'mallory@demo.test', role: 'admin' },
  },
  { method: 'GET', path: '/my-invites' },
  { method: 'POST', path: `/invites/${missingId}/accept` },
  {
    method: 'PATCH',
    path: `/memberships/${missingId}`,
    body: { role: 'admin' },
  },
  {
    method: 'PUT',
    path: `/memberships/${missingId}/manager`,
    body: { managerMembershipId: null },
  },
  {
    method: 'POST',
    path: '/companies',
    body: {
      name: 'Personal Co',
      slug: `personal-${crypto.randomUUID().slice(0, 8)}`,
    },
  },
  {
    method: 'POST',
    path: '/me/personal-email',
    body: { email: personalEmail },
  },
  { method: 'POST', path: '/ladders', body: { name: 'Engineering' } },
  {
    method: 'POST',
    path: `/ladder-versions/${missingId}/levels`,
    body: { name: 'Senior', rank: 1 },
  },
  {
    method: 'POST',
    path: `/ladder-versions/${missingId}/criteria`,
    body: { name: 'Impact' },
  },
  {
    method: 'PUT',
    path: `/ladder-versions/${missingId}/expectations`,
    body: { levelId: missingId, criterionId: missingId, body: 'Ships' },
  },
  { method: 'POST', path: `/ladder-versions/${missingId}/publish` },
];

describe('personal actor', () => {
  test('a personal email signs in as the same user without a company actor', async () => {
    await migrateDatabase();
    await seedDemo();

    const company = await signIn(demoUser.email);
    const personal = await signInPersonal(company);

    const actorResponse = await authed(personal, 'GET', '/personal-actor');
    expect(actorResponse.status).toBe(200);
    const actor = personalActorSchema.parse(await actorResponse.json());
    expect(`${actor.userId}`).toBe(demoUser.id);

    const companyDenied = await authed(personal, 'GET', '/company-actor');
    expect(companyDenied.status).toBe(403);
    const personalDenied = await authed(company, 'GET', '/personal-actor');
    expect(personalDenied.status).toBe(403);
  });

  test('a personal session is refused on every company route', async () => {
    await migrateDatabase();
    await seedDemo();

    const personal = await signInPersonal(await signIn(demoUser.email));

    const statuses: string[] = [];
    for (const route of companyRoutes) {
      const response = await authed(
        personal,
        route.method,
        route.path,
        route.body,
      );
      statuses.push(`${route.method} ${route.path} ${response.status}`);
    }
    expect(statuses).toEqual(
      companyRoutes.map((route) => `${route.method} ${route.path} 403`),
    );
  });
});
