import { describe, expect, test } from 'bun:test';
import { companyActorSchema, memberSchema } from '@reviews/contracts';
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

describe('companies', () => {
  test('an owner invites a member and sets their manager', async () => {
    await migrateDatabase();
    await seedDemo();

    const grace = await signIn('grace@new.test');
    const created = await authed(grace, 'POST', '/companies', {
      name: 'Northwind',
      slug: 'northwind',
    });
    expect(created.status).toBe(200);
    const owner = companyActorSchema.parse(await created.json());
    expect(owner.role).toBe('owner');

    const actor = await authed(grace, 'GET', '/company-actor');
    expect(actor.status).toBe(200);

    const invited = await authed(grace, 'POST', '/invites', {
      email: 'bea@new.test',
      role: 'member',
    });
    expect(invited.status).toBe(200);
    const invitation = (await invited.json()) as { id: string };

    const bea = await signIn('bea@new.test');
    const accepted = await authed(
      bea,
      'POST',
      `/invites/${invitation.id}/accept`,
    );
    expect(accepted.status).toBe(200);
    const memberActor = companyActorSchema.parse(await accepted.json());

    const denied = await authed(bea, 'POST', '/invites', {
      email: 'cy@new.test',
      role: 'member',
    });
    expect(denied.status).toBe(403);

    const managed = await authed(
      grace,
      'PUT',
      `/memberships/${memberActor.membershipId}/manager`,
      { managerMembershipId: owner.membershipId },
    );
    expect(managed.status).toBe(200);

    const listed = await authed(grace, 'GET', '/members');
    const members = memberSchema.array().parse(await listed.json());
    const report = members.find(
      (person) => `${person.membershipId}` === `${memberActor.membershipId}`,
    );
    expect(report?.role).toBe('member');
    expect(`${report?.managerMembershipId}`).toBe(`${owner.membershipId}`);

    const cycle = await authed(
      grace,
      'PUT',
      `/memberships/${owner.membershipId}/manager`,
      { managerMembershipId: memberActor.membershipId },
    );
    expect(cycle.status).toBe(400);

    const promoted = await authed(
      grace,
      'PATCH',
      `/memberships/${memberActor.membershipId}`,
      { role: 'admin' },
    );
    expect(promoted.status).toBe(200);

    const demoteOwner = await authed(
      grace,
      'PATCH',
      `/memberships/${owner.membershipId}`,
      { role: 'member' },
    );
    expect(demoteOwner.status).toBe(403);
  });
});
