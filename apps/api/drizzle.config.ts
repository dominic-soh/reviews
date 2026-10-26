import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/contexts/identity/infra/schema.ts',
    './src/contexts/identity/infra/auth-schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://reviews:reviews@127.0.0.1:5432/reviews',
  },
});
