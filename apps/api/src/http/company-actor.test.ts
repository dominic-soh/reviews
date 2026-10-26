import { describe, expect, test } from 'bun:test';
import { demoMembership } from '../contexts/identity/domain/demo';
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
    expect(await actorResponse.json()).toEqual({
      membershipId: demoMembership.id,
      companyId: demoMembership.companyId,
      role: 'owner',
    });
  });
});
