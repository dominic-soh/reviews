import { expect, test } from 'bun:test';
import { demoUser } from '../contexts/identity/domain/demo';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { seedDemo } from '../contexts/identity/infra/seed';
import { migrateDatabase } from '../migrate';
import { app } from './app';

const base = 'http://127.0.0.1:3001';

test('signing out with a bearer token revokes that session', async () => {
  await migrateDatabase();
  await seedDemo();
  let url = '';
  setMagicLinkDelivery(async (_email, mailed) => {
    url = mailed;
  });
  await app.request(`${base}/api/auth/sign-in/magic-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ email: demoUser.email }),
  });
  const verified = await app.request(url, { redirect: 'manual' });
  const token = verified.headers.get('set-auth-token');
  expect(token).toBeTruthy();
  const headers = { authorization: `Bearer ${token}`, origin: base };

  const before = await app.request(`${base}/company-actor`, { headers });
  const signedOut = await app.request(`${base}/api/auth/sign-out`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: '{}',
  });
  const after = await app.request(`${base}/company-actor`, { headers });

  expect([before.status, signedOut.status, after.status]).toEqual([
    200, 200, 401,
  ]);
});
