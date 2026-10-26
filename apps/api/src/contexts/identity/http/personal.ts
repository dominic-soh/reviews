import { personalEmailBodySchema } from '@reviews/contracts';
import { Hono } from 'hono';
import { companyActorForAuthUser } from '../application/company-actor';
import {
  linkPersonalEmail,
  personalActorFor,
  requestPersonalLink,
  verifyPersonalLink,
} from '../application/personal-actor';
import { isPersonalLogin } from '../domain/login-kind';
import { respond } from './respond';
import { signedInUser } from './session';

export const personalRoutes = new Hono();

personalRoutes.post('/me/personal-email', async (c) => {
  const user = await signedInUser(c);
  if (!user || isPersonalLogin(user.loginKind)) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const actor = await companyActorForAuthUser(
    user.authUserId,
    user.organizationId,
  );
  if (!actor) {
    return c.json({ error: 'no membership' }, 403);
  }
  const body = personalEmailBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(c, await linkPersonalEmail(actor, body.data.email));
});

personalRoutes.post('/sign-in/personal', async (c) => {
  const body = personalEmailBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  await requestPersonalLink(body.data.email);
  return c.json({ ok: true });
});

personalRoutes.get('/sign-in/personal/verify', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'invalid' }, 400);
  }
  const result = await verifyPersonalLink(token);
  if (!result.ok) {
    return respond(c, result);
  }
  c.header('set-cookie', result.value.cookie);
  return c.json({ userId: result.value.userId });
});

personalRoutes.get('/personal-actor', async (c) => {
  const user = await signedInUser(c);
  if (!user) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  if (!isPersonalLogin(user.loginKind)) {
    return c.json({ error: 'company' }, 403);
  }
  const actor = await personalActorFor(user.authUserId);
  if (!actor) {
    return c.json({ error: 'not-found' }, 404);
  }
  return c.json(actor);
});
