import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { companyRoutes } from '../contexts/identity/http/companies';
import { companyActorRoutes } from '../contexts/identity/http/company-actor';
import { personalRoutes } from '../contexts/identity/http/personal';
import { auth } from '../contexts/identity/infra/auth';
import { mcpRoutes } from '../contexts/identity/mcp/whoami';
import { ladderRoutes } from '../contexts/ladder/http/ladders';
import { db } from '../db';
import { previewOriginAllowed } from '../preview-origin';

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => (previewOriginAllowed(origin) ? origin : null),
    credentials: true,
    exposeHeaders: ['set-auth-token'],
  }),
);

app.all('/api/auth/organization/*', (c) => c.notFound());
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/', companyActorRoutes);
app.route('/', companyRoutes);
app.route('/', personalRoutes);
app.route('/', ladderRoutes);
app.route('/', mcpRoutes);

app.get('/health', async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, database: 'reachable' });
  } catch {
    return c.json({ ok: false, database: 'unreachable' }, 503);
  }
});
