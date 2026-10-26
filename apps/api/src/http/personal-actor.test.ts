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

describe('personal actor', () => {
  test('a personal email signs in as the same user without a company actor', async () => {
    await migrateDatabase();
    await seedDemo();

    const company = await signIn(demoUser.email);
    const linked = await authed(company, 'POST', '/me/personal-email', {
      email: 'ada.personal@demo.test',
    });
    expect(linked.status).toBe(200);

    let magicUrl = '';
    setMagicLinkDelivery(async (_email, url) => {
      magicUrl = url;
    });
    const started = await app.request(
      'http://127.0.0.1:3001/sign-in/personal',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ada.personal@demo.test' }),
      },
    );
    expect(started.status).toBe(200);
    expect(magicUrl.length).toBeGreaterThan(0);

    const verified = await app.request(magicUrl);
    expect(verified.status).toBe(200);
    const personal = cookieHeader(verified);

    const actorResponse = await authed(personal, 'GET', '/personal-actor');
    expect(actorResponse.status).toBe(200);
    const actor = personalActorSchema.parse(await actorResponse.json());
    expect(`${actor.userId}`).toBe(demoUser.id);

    const companyDenied = await authed(personal, 'GET', '/company-actor');
    expect(companyDenied.status).toBe(403);
    const personalDenied = await authed(company, 'GET', '/personal-actor');
    expect(personalDenied.status).toBe(403);
  });
});
