import {
  ladderExpectationBodySchema,
  ladderLevelBodySchema,
  ladderNameBodySchema,
} from '@reviews/contracts';
import { Hono } from 'hono';
import { respond } from '../../identity/http/respond';
import { companyActor } from '../../identity/http/session';
import {
  addCriterion,
  addLevel,
  createLadder,
  publishLadder,
  setExpectation,
} from '../application/ladders';

export const ladderRoutes = new Hono();

ladderRoutes.post('/ladders', companyActor, async (c) => {
  const body = ladderNameBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(c, await createLadder(c.var.actor, body.data.name));
});

ladderRoutes.post('/ladder-versions/:id/levels', companyActor, async (c) => {
  const body = ladderLevelBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await addLevel(
      c.var.actor,
      c.req.param('id'),
      body.data.name,
      body.data.rank,
    ),
  );
});

ladderRoutes.post('/ladder-versions/:id/criteria', companyActor, async (c) => {
  const body = ladderNameBodySchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await addCriterion(c.var.actor, c.req.param('id'), body.data.name),
  );
});

ladderRoutes.put(
  '/ladder-versions/:id/expectations',
  companyActor,
  async (c) => {
    const body = ladderExpectationBodySchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: 'invalid' }, 400);
    }
    return respond(
      c,
      await setExpectation(c.var.actor, c.req.param('id'), body.data),
    );
  },
);

ladderRoutes.post('/ladder-versions/:id/publish', companyActor, async (c) => {
  return respond(c, await publishLadder(c.var.actor, c.req.param('id')));
});
