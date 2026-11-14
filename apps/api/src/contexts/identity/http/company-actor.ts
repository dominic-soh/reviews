import { Hono } from 'hono';
import { companyActor } from './session';

export const companyActorRoutes = new Hono();

companyActorRoutes.get('/company-actor', companyActor, (c) =>
  c.json(c.var.actor),
);
