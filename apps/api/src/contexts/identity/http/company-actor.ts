import { Hono } from 'hono';
import { companyActorForAuthUser } from '../application/company-actor';
import { isPersonalLogin } from '../domain/login-kind';
import { signedInUser } from './session';

export const companyActorRoutes = new Hono();

companyActorRoutes.get('/company-actor', async (c) => {
  const user = await signedInUser(c);
  if (!user) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  if (isPersonalLogin(user.loginKind)) {
    return c.json({ error: 'personal' }, 403);
  }

  const actor = await companyActorForAuthUser(
    user.authUserId,
    user.organizationId,
  );
  if (!actor) {
    return c.json({ error: 'no membership' }, 403);
  }

  return c.json(actor);
});
