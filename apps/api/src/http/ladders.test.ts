import { describe, expect, test } from 'bun:test';
import { demoUser } from '../contexts/identity/domain/demo';
import { setMagicLinkDelivery } from '../contexts/identity/infra/mail';
import { seedDemo } from '../contexts/identity/infra/seed';
import { readExpectation } from '../contexts/ladder/application/ladders';
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

describe('ladders', () => {
  test('a published version rejects further edits', async () => {
    await migrateDatabase();
    await seedDemo();
    const cookie = await signIn(demoUser.email);

    const created = await authed(cookie, 'POST', '/ladders', {
      name: 'Engineering',
    });
    expect(created.status).toBe(200);
    const ladder = (await created.json()) as {
      ladderId: string;
      versionId: string;
    };

    const level = await authed(
      cookie,
      'POST',
      `/ladder-versions/${ladder.versionId}/levels`,
      { name: 'Senior', rank: 1 },
    );
    expect(level.status).toBe(200);
    const levelId = ((await level.json()) as { id: string }).id;

    const criterion = await authed(
      cookie,
      'POST',
      `/ladder-versions/${ladder.versionId}/criteria`,
      { name: 'Scope' },
    );
    expect(criterion.status).toBe(200);
    const criterionId = ((await criterion.json()) as { id: string }).id;

    const written = await authed(
      cookie,
      'PUT',
      `/ladder-versions/${ladder.versionId}/expectations`,
      { levelId, criterionId, body: 'Leads a team' },
    );
    expect(written.status).toBe(200);

    const published = await authed(
      cookie,
      'POST',
      `/ladder-versions/${ladder.versionId}/publish`,
    );
    expect(published.status).toBe(200);

    const edited = await authed(
      cookie,
      'POST',
      `/ladder-versions/${ladder.versionId}/levels`,
      { name: 'Staff', rank: 2 },
    );
    expect(edited.status).toBe(400);

    const actor = await authed(cookie, 'GET', '/company-actor');
    const company = (await actor.json()) as {
      companyId: string;
      role: 'owner';
    };
    expect(
      await readExpectation(
        { companyId: company.companyId, role: company.role },
        ladder.versionId,
        levelId,
        criterionId,
      ),
    ).toBe('Leads a team');
  });

  test('invalid ladder bodies are rejected', async () => {
    await migrateDatabase();
    await seedDemo();
    const cookie = await signIn(demoUser.email);
    const versionId = '00000000-0000-0000-0000-000000000000';
    const cases = [
      { method: 'POST', path: '/ladders', body: {} },
      { method: 'POST', path: '/ladders', body: { name: '' } },
      {
        method: 'POST',
        path: `/ladder-versions/${versionId}/levels`,
        body: { name: 'Senior', rank: 1.5 },
      },
      {
        method: 'PUT',
        path: `/ladder-versions/${versionId}/expectations`,
        body: { criterionId: 'c', body: 'Leads a team' },
      },
    ];

    for (const entry of cases) {
      const response = await authed(
        cookie,
        entry.method,
        entry.path,
        entry.body,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid' });
    }
  });
});
