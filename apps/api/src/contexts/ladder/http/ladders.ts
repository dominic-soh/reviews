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

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function nameBody(value: unknown): { name: string } | null {
  const body = record(value);
  if (!body || typeof body.name !== 'string' || body.name.length === 0) {
    return null;
  }
  return { name: body.name };
}

function levelBody(value: unknown): { name: string; rank: number } | null {
  const body = record(value);
  const name = body ? nameBody(body) : null;
  if (
    !body ||
    !name ||
    typeof body.rank !== 'number' ||
    !Number.isInteger(body.rank)
  ) {
    return null;
  }
  return { name: name.name, rank: body.rank };
}

function expectationBody(
  value: unknown,
): { levelId: string; criterionId: string; body: string } | null {
  const body = record(value);
  if (
    !body ||
    typeof body.levelId !== 'string' ||
    typeof body.criterionId !== 'string' ||
    typeof body.body !== 'string'
  ) {
    return null;
  }
  return {
    levelId: body.levelId,
    criterionId: body.criterionId,
    body: body.body,
  };
}

export const ladderRoutes = new Hono();

ladderRoutes.post('/ladders', companyActor, async (c) => {
  const body = nameBody(await c.req.json());
  if (!body) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(c, await createLadder(c.var.actor, body.name));
});

ladderRoutes.post('/ladder-versions/:id/levels', companyActor, async (c) => {
  const body = levelBody(await c.req.json());
  if (!body) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await addLevel(c.var.actor, c.req.param('id'), body.name, body.rank),
  );
});

ladderRoutes.post('/ladder-versions/:id/criteria', companyActor, async (c) => {
  const body = nameBody(await c.req.json());
  if (!body) {
    return c.json({ error: 'invalid' }, 400);
  }
  return respond(
    c,
    await addCriterion(c.var.actor, c.req.param('id'), body.name),
  );
});

ladderRoutes.put(
  '/ladder-versions/:id/expectations',
  companyActor,
  async (c) => {
    const body = expectationBody(await c.req.json());
    if (!body) {
      return c.json({ error: 'invalid' }, 400);
    }
    return respond(
      c,
      await setExpectation(c.var.actor, c.req.param('id'), body),
    );
  },
);

ladderRoutes.post('/ladder-versions/:id/publish', companyActor, async (c) => {
  return respond(c, await publishLadder(c.var.actor, c.req.param('id')));
});
