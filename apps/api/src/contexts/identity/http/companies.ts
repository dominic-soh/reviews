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
import { respond } from './respond';
import { companyActor, companyLogin } from './session';

export const companyRoutes = new Hono();

companyRoutes.post('/companies', companyLogin, async (c) => {
  const body = createCompanyBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  const user = c.var.user;
  const result = await createCompany({
    authUserId: user.authUserId,
    email: user.email,
    name: user.name,
    companyName: body.data.name,
    slug: body.data.slug,
  });
  return respond(c, result);
});

companyRoutes.get('/invites', companyActor, async (c) =>
  respond(c, await listPendingInvites(c.var.actor)),
);

companyRoutes.get('/my-invites', companyLogin, async (c) =>
  c.json(await listMyInvites(c.var.user.email)),
);

companyRoutes.post('/invites', companyActor, async (c) => {
  const body = inviteBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await inviteMember(c.var.actor, c.var.user.authUserId, body.data),
  );
});

companyRoutes.post('/invites/:id/accept', companyLogin, async (c) => {
  const user = c.var.user;
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

companyRoutes.patch('/memberships/:id', companyActor, async (c) => {
  const body = setRoleBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await setMembershipRole(c.var.actor, c.req.param('id'), body.data.role),
  );
});

companyRoutes.put('/memberships/:id/manager', companyActor, async (c) => {
  const body = setManagerBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await setManager(
      c.var.actor,
      c.req.param('id'),
      body.data.managerMembershipId,
    ),
  );
});

companyRoutes.get('/members', companyActor, async (c) =>
  c.json(await listMembers(c.var.actor)),
);
