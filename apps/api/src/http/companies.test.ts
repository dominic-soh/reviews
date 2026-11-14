import { describe, expect, test } from 'bun:test';
import {
  companyActorSchema,
  invitationSchema,
  memberSchema,
  myInvitationSchema,
} from '@reviews/contracts';
import { and, eq } from 'drizzle-orm';
import { authConfig } from '../auth-config';
import { invitation } from '../contexts/identity/infra/auth-schema';
import {
  setInviteDelivery,
  setMagicLinkDelivery,
} from '../contexts/identity/infra/mail';
import {
  companies,
  memberships,
  users,
} from '../contexts/identity/infra/schema';
import { seedDemo } from '../contexts/identity/infra/seed';
import { db } from '../db';
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
      slug: `northwind-${crypto.randomUUID().slice(0, 8)}`,
    });
    expect(created.status).toBe(200);
    const owner = companyActorSchema.parse(await created.json());
    expect(owner.role).toBe('owner');
    expect(owner.companyName).toBe('Northwind');

    const sent: {
      email: string;
      companyName: string;
      link: string;
      inviterName?: string;
    }[] = [];
    setInviteDelivery(async (email, companyName, link, inviterName) => {
      sent.push({ email, companyName, link, inviterName });
    });

    const actor = await authed(grace, 'GET', '/company-actor');
    expect(actor.status).toBe(200);

    const invited = await authed(grace, 'POST', '/invites', {
      email: 'bea@new.test',
      role: 'member',
    });
    expect(invited.status).toBe(200);
    const invitation = invitationSchema.parse(await invited.json());
    expect(sent).toHaveLength(1);
    const [delivered] = sent;
    expect(delivered?.email).toBe('bea@new.test');
    expect(delivered?.companyName).toBe('Northwind');
    expect(delivered?.inviterName).toBeUndefined();
    expect(delivered?.link.startsWith(authConfig.appURL)).toBe(true);
    expect(delivered?.link).toContain(
      `email=${encodeURIComponent('bea@new.test')}`,
    );
    expect(delivered?.link).not.toContain(invitation.id);
    expect(delivered?.link).not.toContain('token=');

    const pending = invitationSchema
      .array()
      .parse(await (await authed(grace, 'GET', '/invites')).json());
    expect(pending.map((row) => row.email)).toEqual(['bea@new.test']);

    const again = await authed(grace, 'POST', '/invites', {
      email: 'bea@new.test',
      role: 'member',
    });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({
      error: 'conflict',
      reason: 'invited',
    });

    const alreadyMember = await authed(grace, 'POST', '/invites', {
      email: 'grace@new.test',
      role: 'member',
    });
    expect(alreadyMember.status).toBe(409);
    expect(await alreadyMember.json()).toEqual({
      error: 'conflict',
      reason: 'member',
    });

    const bea = await signIn('bea@new.test');
    const mine = myInvitationSchema
      .array()
      .parse(await (await authed(bea, 'GET', '/my-invites')).json());
    expect(mine.map((row) => row.companyName)).toEqual(['Northwind']);
    const accepted = await authed(
      bea,
      'POST',
      `/invites/${invitation.id}/accept`,
    );
    expect(accepted.status).toBe(200);
    const memberActor = companyActorSchema.parse(await accepted.json());
    expect(memberActor.companyName).toBe('Northwind');

    const hidden = await authed(bea, 'GET', '/invites');
    expect(hidden.status).toBe(403);
    const cleared = invitationSchema
      .array()
      .parse(await (await authed(grace, 'GET', '/invites')).json());
    expect(cleared).toEqual([]);

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

  test('an invite includes the inviter name when the inviter has one', async () => {
    await migrateDatabase();
    await seedDemo();

    const sent: { inviterName?: string }[] = [];
    setInviteDelivery(async (_email, _companyName, _link, inviterName) => {
      sent.push({ inviterName });
    });

    const ada = await signIn('ada@demo.test');
    const invited = await authed(ada, 'POST', '/invites', {
      email: `invitee-${crypto.randomUUID().slice(0, 8)}@new.test`,
      role: 'member',
    });
    expect(invited.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.inviterName).toBe('Ada Demo');
  });

  test('concurrent creates with the same slug end in one company and conflicts', async () => {
    await migrateDatabase();
    const slug = `race-${crypto.randomUUID().slice(0, 8)}`;
    const founders: string[] = [];
    for (const n of [1, 2, 3, 4, 5]) {
      founders.push(await signIn(`${slug}-${n}@new.test`));
    }

    const responses = await Promise.all(
      founders.map((cookie) =>
        authed(cookie, 'POST', '/companies', { name: 'Race', slug }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409, 409, 409, 409,
    ]);
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug));
    expect(rows.length).toBe(1);
  });

  test('accepting an invitation to a company you already belong to is a conflict', async () => {
    await migrateDatabase();
    const { company, inviteeEmail, invitationId } = await companyWithInvite();
    const invitee = await signIn(inviteeEmail);
    const accepted = await authed(
      invitee,
      'POST',
      `/invites/${invitationId}/accept`,
    );
    expect(accepted.status).toBe(200);

    const [original] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, invitationId));
    if (!original) {
      throw new Error('invitation missing');
    }
    const duplicateId = `invitation_${crypto.randomUUID()}`;
    await db
      .insert(invitation)
      .values({ ...original, id: duplicateId, status: 'pending' });

    const again = await authed(
      invitee,
      'POST',
      `/invites/${duplicateId}/accept`,
    );
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: 'conflict', reason: 'member' });
    expect(await membershipCount(company.companyId, inviteeEmail)).toBe(1);

    const mine = myInvitationSchema
      .array()
      .parse(await (await authed(invitee, 'GET', '/my-invites')).json());
    expect(mine).toEqual([]);
  });

  test('concurrent accepts of one invitation create exactly one membership', async () => {
    await migrateDatabase();
    const { company, inviteeEmail, invitationId } = await companyWithInvite();
    const invitee = await signIn(inviteeEmail);

    const responses = await Promise.all([
      authed(invitee, 'POST', `/invites/${invitationId}/accept`),
      authed(invitee, 'POST', `/invites/${invitationId}/accept`),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses[0]).toBe(200);
    expect([404, 409]).toContain(statuses[1]);
    expect(await membershipCount(company.companyId, inviteeEmail)).toBe(1);
  });
});

async function companyWithInvite() {
  const tag = crypto.randomUUID().slice(0, 8);
  const ownerCookie = await signIn(`owner-${tag}@new.test`);
  const created = await authed(ownerCookie, 'POST', '/companies', {
    name: `Company ${tag}`,
    slug: `company-${tag}`,
  });
  expect(created.status).toBe(200);
  const company = companyActorSchema.parse(await created.json());

  setInviteDelivery(async () => {});
  const inviteeEmail = `invitee-${tag}@new.test`;
  const invited = await authed(ownerCookie, 'POST', '/invites', {
    email: inviteeEmail,
    role: 'member',
  });
  expect(invited.status).toBe(200);
  const sent = invitationSchema.parse(await invited.json());
  return { company, inviteeEmail, invitationId: sent.id };
}

async function membershipCount(
  companyId: string,
  email: string,
): Promise<number> {
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.companyId, companyId), eq(users.email, email)));
  return rows.length;
}
