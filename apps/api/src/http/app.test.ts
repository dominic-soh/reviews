import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { companies } from '../contexts/identity/infra/schema';
import { seedDemo } from '../contexts/identity/infra/seed';
import { db } from '../db';
import { migrateDatabase } from '../migrate';
import { app } from './app';

const previewOrigin = 'http://127.0.0.1:3000';

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
