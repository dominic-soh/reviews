import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { databaseUrl } from './db';

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '../drizzle',
);

async function ensureTenantRole(
  client: ReturnType<typeof postgres>,
): Promise<void> {
  const existing = await client<{ rolname: string }[]>`
    select rolname from pg_roles where rolname = 'reviews_app'
  `;
  if (existing.length > 0) {
    return;
  }
  await client.unsafe('create role reviews_app noinherit');
}

export async function migrateDatabase(): Promise<void> {
  const migrationClient = postgres(databaseUrl(), { max: 1 });
  try {
    await ensureTenantRole(migrationClient);
    await migrate(drizzle(migrationClient), { migrationsFolder });
  } finally {
    await migrationClient.end();
  }
}

const isDirectRun = process.argv[1]?.endsWith('migrate.ts') === true;

if (isDirectRun) {
  await migrateDatabase();
  process.exit(0);
}
