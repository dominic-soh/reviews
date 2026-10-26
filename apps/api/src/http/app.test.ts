import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { companies } from '../contexts/identity/infra/schema';
import { seedDemo } from '../contexts/identity/infra/seed';
import { db } from '../db';
import { migrateDatabase } from '../migrate';
import { app } from './app';

describe('GET /health', () => {
  test('reports that the database is reachable', async () => {
    await migrateDatabase();
    await seedDemo();

    const response = await app.request('/health');
    const seeded = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, 'demo'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, database: 'reachable' });
    expect(seeded).toHaveLength(1);
  });
});
