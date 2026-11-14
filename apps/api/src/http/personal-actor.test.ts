import { describe, expect, test } from 'bun:test';
import { personalActorSchema } from '@reviews/contracts';
import { demoUser } from '../contexts/identity/domain/demo';
import {
  setMagicLinkDelivery,
  setSignInCodeDelivery,
} from '../contexts/identity/infra/mail';
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

async function linkPersonal(company: string): Promise<void> {
  const linked = await authed(company, 'POST', '/me/personal-email', {
    email: personalEmail,
  });
  expect(linked.status).toBe(200);
}

async function requestCode(): Promise<string> {
  let code = '';
  setSignInCodeDelivery(async (email, otp) => {
    expect(email).toBe(personalEmail);
    code = otp;
  });
  const started = await app.request('http://127.0.0.1:3001/sign-in/personal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: personalEmail }),
  });
  expect(started.status).toBe(200);
  expect(code).toMatch(/^\d{6}$/);
  return code;
}

function verifyCode(code: string) {
  return app.request('http://127.0.0.1:3001/sign-in/personal/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: personalEmail, code }),
  });
}

function otherCode(code: string): string {
  return code === '000000' ? '111111' : '000000';
}

async function signInPersonal(
  company: string,
): Promise<{ cookie: string; bearer: string }> {
  await linkPersonal(company);
  const verified = await verifyCode(await requestCode());
  expect(verified.status).toBe(200);
  const bearer = verified.headers.get('set-auth-token') ?? '';
  expect(bearer.length).toBeGreaterThan(0);
  return { cookie: cookieHeader(verified), bearer };
}

function asBearer(token: string, path: string) {
  return app.request(`http://127.0.0.1:3001${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
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

    const byCookie = await authed(personal.cookie, 'GET', '/personal-actor');
    expect(byCookie.status).toBe(200);
    const actor = personalActorSchema.parse(await byCookie.json());
    expect(`${actor.userId}`).toBe(demoUser.id);

    const byBearer = await asBearer(personal.bearer, '/personal-actor');
    expect(byBearer.status).toBe(200);
    const bearerActor = personalActorSchema.parse(await byBearer.json());
    expect(`${bearerActor.userId}`).toBe(demoUser.id);

    const companyDenied = await authed(
      personal.cookie,
      'GET',
      '/company-actor',
    );
    expect(companyDenied.status).toBe(403);
    const bearerDenied = await asBearer(personal.bearer, '/company-actor');
    expect(bearerDenied.status).toBe(403);
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
        personal.cookie,
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

  test('a code signs in only once', async () => {
    await migrateDatabase();
    await seedDemo();
    await linkPersonal(await signIn(demoUser.email));

    const code = await requestCode();
    const [first, second] = await Promise.all([
      verifyCode(code),
      verifyCode(code),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 400]);

    const replay = await verifyCode(code);
    expect(replay.status).toBe(400);
    expect(replay.headers.get('set-auth-token')).toBeNull();
  });

  test('five wrong codes burn the pending code', async () => {
    await migrateDatabase();
    await seedDemo();
    await linkPersonal(await signIn(demoUser.email));

    const code = await requestCode();
    const wrong = otherCode(code);
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      statuses.push((await verifyCode(wrong)).status);
    }
    expect(statuses).toEqual([400, 400, 400, 400, 400]);

    const right = await verifyCode(code);
    expect(right.status).toBe(400);

    const fresh = await verifyCode(await requestCode());
    expect(fresh.status).toBe(200);
  });

  test('an unlinked email is acknowledged without sending a code', async () => {
    await migrateDatabase();
    await seedDemo();
    let sent = false;
    setSignInCodeDelivery(async () => {
      sent = true;
    });

    const started = await app.request(
      'http://127.0.0.1:3001/sign-in/personal',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'nobody.personal@demo.test' }),
      },
    );
    expect(started.status).toBe(200);
    expect(await started.json()).toEqual({ ok: true });
    expect(sent).toBe(false);
  });

  test('the emailed link verifier is gone', async () => {
    const response = await app.request(
      'http://127.0.0.1:3001/sign-in/personal/verify?token=anything',
    );
    expect(response.status).toBe(404);
  });
});
