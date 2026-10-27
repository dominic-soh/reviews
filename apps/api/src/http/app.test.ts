import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { companies } from '../contexts/identity/infra/schema';
import { seedDemo } from '../contexts/identity/infra/seed';
import { db } from '../db';
import { migrateDatabase } from '../migrate';
import { app } from './app';

const previewOrigin = 'http://127.0.0.1:3000';

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((cookie) => cookie.length > 0)
    .join('; ');
}

async function signInDemoUser(): Promise<string> {
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
      body: JSON.stringify({ email: 'ada@demo.test' }),
    },
  );

  expect(started.status).toBe(200);
  const verified = await app.request(magicUrl, { redirect: 'manual' });
  return cookieHeader(verified);
}

describe('GET /health', () => {
  test('reports that the database is reachable', async () => {
    await migrateDatabase();
    await seedDemo();

    const response = await app.request('/health');
    const seeded = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, 'demo'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, database: 'reachable' });
    expect(seeded).toHaveLength(1);
  });
});

describe('organization plugin routes', () => {
  test('are not exposed over HTTP while normal auth remains available', async () => {
    await migrateDatabase();
    await seedDemo();

    const cookie = await signInDemoUser();
    const organizationRequests = [
      { method: 'POST', path: '/api/auth/organization/create' },
      { method: 'POST', path: '/api/auth/organization/update-member-role' },
      { method: 'POST', path: '/api/auth/organization/remove-member' },
      { method: 'POST', path: '/api/auth/organization/accept-invitation' },
      { method: 'GET', path: '/api/auth/organization/list' },
    ];
    const statuses = await Promise.all(
      organizationRequests.map(async ({ method, path }) => {
        const response = await app.request(`http://127.0.0.1:3001${path}`, {
          method,
          headers: {
            cookie,
            origin: 'http://127.0.0.1:3001',
          },
        });
        return response.status;
      }),
    );

    expect(statuses).toEqual([404, 404, 404, 404, 404]);

    const session = await app.request(
      'http://127.0.0.1:3001/api/auth/get-session',
      {
        headers: { cookie, origin: 'http://127.0.0.1:3001' },
      },
    );
    expect(session.status).toBe(200);
  });
});

describe('web preview CORS', () => {
  test('answers the sign-in preflight from the web preview', async () => {
    const preflight = await app.request(
      'http://127.0.0.1:3001/api/auth/sign-in/magic-link',
      {
        method: 'OPTIONS',
        headers: {
          origin: previewOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      },
    );

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(
      previewOrigin,
    );
    expect(preflight.headers.get('access-control-allow-credentials')).toBe(
      'true',
    );
    expect(
      preflight.headers.get('access-control-allow-headers')?.toLowerCase(),
    ).toContain('content-type');
  });

  test('accepts a sign-in from the web preview and exposes the response', async () => {
    await migrateDatabase();
    await seedDemo();
    setMagicLinkDelivery(async () => {});

    const signIn = await app.request(
      'http://127.0.0.1:3001/api/auth/sign-in/magic-link',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: previewOrigin,
          'sec-fetch-site': 'same-site',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
        },
        body: JSON.stringify({ email: 'ada@demo.test' }),
      },
    );

    expect(signIn.status).toBe(200);
    expect(signIn.headers.get('access-control-allow-origin')).toBe(
      previewOrigin,
    );
    expect(signIn.headers.get('access-control-allow-credentials')).toBe('true');
  });

  test('mails a return to the page that asked for the link', async () => {
    await migrateDatabase();
    await seedDemo();
    let mailed = '';
    setMagicLinkDelivery(async (_email, url) => {
      mailed = url;
    });
    const page = `${previewOrigin}/main.lynx.bundle?fullscreen=true`;

    const signIn = await app.request(
      'http://127.0.0.1:3001/api/auth/sign-in/magic-link',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: previewOrigin,
        },
        body: JSON.stringify({
          email: 'ada@demo.test',
          callbackURL: page,
        }),
      },
    );

    expect(signIn.status).toBe(200);
    const mailedURL = new URL(mailed);
    expect(`${mailedURL.origin}${mailedURL.pathname}`).toBe(
      `${previewOrigin}/main.lynx.bundle`,
    );
    expect(mailedURL.searchParams.get('fullscreen')).toBe('true');
    const token = mailedURL.searchParams.get('sign-in');
    expect(token).toBeTruthy();

    const verified = await app.request(
      `http://127.0.0.1:3001/api/auth/magic-link/verify?token=${token}`,
      { headers: { origin: previewOrigin } },
    );
    expect(verified.status).toBe(200);
  });

  test('exposes company session responses and hides other origins', async () => {
    const allowed = await app.request('http://127.0.0.1:3001/company-actor', {
      headers: { origin: previewOrigin },
    });
    const denied = await app.request('http://127.0.0.1:3001/company-actor', {
      headers: { origin: 'http://evil.example' },
    });

    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      previewOrigin,
    );
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });
});
