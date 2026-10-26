import { Hono } from 'hono';
import { companyActorForAuthUser } from '../application/company-actor';
import { auth } from '../infra/auth';

export const companyActorRoutes = new Hono();

companyActorRoutes.get('/company-actor', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  const actor = await companyActorForAuthUser(session.user.id);
  if (!actor) {
    return c.json({ error: 'no membership' }, 403);
  }

  return c.json(actor);
});
