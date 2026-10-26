import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { companyActorRoutes } from '../contexts/identity/http/company-actor';
import { auth } from '../contexts/identity/infra/auth';
import { mcpRoutes } from '../contexts/identity/mcp/whoami';
import { db } from '../db';

export const app = new Hono();

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/', companyActorRoutes);
app.route('/', mcpRoutes);

app.get('/health', async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, database: 'reachable' });
  } catch {
    return c.json({ ok: false, database: 'unreachable' }, 503);
  }
});
