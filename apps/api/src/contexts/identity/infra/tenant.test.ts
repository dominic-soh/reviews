import { describe, expect, test } from 'bun:test';
import { migrateDatabase } from '../../../migrate';
import { demoCompany } from '../domain/demo';
import { memberships } from './schema';
import { seedDemo } from './seed';
import { asAppRole } from './tenant';

describe('row security', () => {
  test('a membership query without a company returns nothing', async () => {
    await migrateDatabase();
    await seedDemo();

    const hidden = await asAppRole(null, (tx) => tx.select().from(memberships));
    expect(hidden).toHaveLength(0);

    const visible = await asAppRole(demoCompany.id, (tx) =>
      tx.select().from(memberships),
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((row) => row.companyId === demoCompany.id)).toBe(true);
  });
});
