import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, organization } from 'better-auth/plugins';
import { db } from '../../../db';
import { authSchema } from './auth-schema';
import { sendMagicLink } from './mail';

export const authSecret =
  process.env.BETTER_AUTH_SECRET ?? 'dev-secret-dev-secret-dev-secret';

export const auth = betterAuth({
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3001',
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
    organization(),
  ],
});
