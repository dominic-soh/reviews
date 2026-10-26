import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './contexts/identity/infra/auth-schema';
import * as schema from './contexts/identity/infra/schema';
import * as ladderSchema from './contexts/ladder/infra/schema';

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}

const queryClient = postgres(databaseUrl());

export const db = drizzle(queryClient, {
  schema: { ...schema, ...authSchema, ...ladderSchema },
});
