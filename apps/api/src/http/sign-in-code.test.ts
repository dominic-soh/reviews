import { describe, expect, test } from 'bun:test';
import { companyActorSchema } from '@reviews/contracts';
import { setSignInCodeDelivery } from '../contexts/identity/infra/mail';
import { seedDemo } from '../contexts/identity/infra/seed';
import { migrateDatabase } from '../migrate';
import { app } from './app';

const previewOrigin = 'http://127.0.0.1:3000';

function previewHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  next.set('origin', previewOrigin);
  next.set('content-type', 'application/json');
  return next;
}

describe('email sign-in code', () => {
  test('a code signs Ada in and the next request carries the token', async () => {
    await migrateDatabase();
    await seedDemo();
    let code = '';
    setSignInCodeDelivery(async (_email, otp) => {
      code = otp;
    });

    const sent = await app.request(
      'http://127.0.0.1:3001/api/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        headers: previewHeaders(),
        body: JSON.stringify({ email: 'ada@demo.test', type: 'sign-in' }),
      },
    );
    expect(sent.status).toBe(200);
    expect(code).toMatch(/^\d{6}$/);

    const signIn = await app.request(
      'http://127.0.0.1:3001/api/auth/sign-in/email-otp',
      {
        method: 'POST',
        headers: previewHeaders(),
        body: JSON.stringify({ email: 'ada@demo.test', otp: code }),
      },
    );
    expect(signIn.status).toBe(200);
    const token = signIn.headers.get('set-auth-token');
    expect(token).toBeTruthy();

    const actor = await app.request('http://127.0.0.1:3001/company-actor', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(actor.status).toBe(200);
    const body = companyActorSchema.parse(await actor.json());
    expect(body.slug).toBe('demo');
    expect(body.role).toBe('owner');
  });
});
