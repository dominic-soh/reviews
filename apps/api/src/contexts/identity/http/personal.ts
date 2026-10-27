import { personalEmailBodySchema } from '@reviews/contracts';
import { Hono } from 'hono';
import {
  linkPersonalEmail,
  personalActorFor,
  requestPersonalLink,
  verifyPersonalLink,
} from '../application/personal-actor';
import { respond } from './respond';
import { companyActor, personalLogin } from './session';

export const personalRoutes = new Hono();

personalRoutes.post('/me/personal-email', companyActor, async (c) => {
  const body = personalEmailBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(c, await linkPersonalEmail(c.var.actor, body.data.email));
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

personalRoutes.get('/personal-actor', personalLogin, async (c) => {
  const actor = await personalActorFor(c.var.user.authUserId);
  if (!actor) {
    return c.json({ error: 'not-found' }, 404);
  }
  return c.json(actor);
});
