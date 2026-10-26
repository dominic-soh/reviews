import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';

export const app = new Hono();

app.get('/health', async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, database: 'reachable' });
  } catch {
    return c.json({ ok: false, database: 'unreachable' }, 503);
  }
});
