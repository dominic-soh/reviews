import {
  createCompanyBodySchema,
  inviteBodySchema,
  setManagerBodySchema,
  setRoleBodySchema,
} from '@reviews/contracts';
import { Hono } from 'hono';
import {
  acceptInvite,
  createCompany,
  inviteMember,
  listMembers,
  listMyInvites,
  listPendingInvites,
  setManager,
  setMembershipRole,
} from '../application/companies';
import { companyActorForAuthUser } from '../application/company-actor';
import { respond } from './respond';
import { signedInUser } from './session';

export const companyRoutes = new Hono();

companyRoutes.post('/companies', async (c) => {
  const user = await signedInUser(c);
  if (!user) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const body = createCompanyBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  const result = await createCompany({
    authUserId: user.authUserId,
    email: user.email,
    name: user.name,
    companyName: body.data.name,
    slug: body.data.slug,
  });
  return respond(c, result);
});

async function actorFor(c: Parameters<typeof signedInUser>[0]) {
  const user = await signedInUser(c);
  if (!user) {
    return null;
  }
  const actor = await companyActorForAuthUser(
    user.authUserId,
    user.organizationId,
  );
  if (!actor) {
    return null;
  }
  return { user, actor };
}

companyRoutes.get('/invites', async (c) => {
  const current = await actorFor(c);
  if (!current) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  return respond(c, await listPendingInvites(current.actor));
});

companyRoutes.get('/my-invites', async (c) => {
  const user = await signedInUser(c);
  if (!user) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  return c.json(await listMyInvites(user.email));
});

companyRoutes.post('/invites', async (c) => {
  const current = await actorFor(c);
  if (!current) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const body = inviteBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await inviteMember(current.actor, current.user.authUserId, body.data),
  );
});

companyRoutes.post('/invites/:id/accept', async (c) => {
  const user = await signedInUser(c);
  if (!user) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  return respond(
    c,
    await acceptInvite({
      authUserId: user.authUserId,
      email: user.email,
      name: user.name,
      invitationId: c.req.param('id'),
    }),
  );
});

companyRoutes.patch('/memberships/:id', async (c) => {
  const current = await actorFor(c);
  if (!current) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const body = setRoleBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await setMembershipRole(current.actor, c.req.param('id'), body.data.role),
  );
});

companyRoutes.put('/memberships/:id/manager', async (c) => {
  const current = await actorFor(c);
  if (!current) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const body = setManagerBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await setManager(
      current.actor,
      c.req.param('id'),
      body.data.managerMembershipId,
    ),
  );
});

companyRoutes.get('/members', async (c) => {
  const current = await actorFor(c);
  if (!current) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  return c.json(await listMembers(current.actor));
});
