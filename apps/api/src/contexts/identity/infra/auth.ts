import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, emailOTP, magicLink, organization } from 'better-auth/plugins';
import { db } from '../../../db';
import {
  hostedApiOrigin,
  previewOriginAllowed,
  trustedPreviewOrigins,
} from '../../../preview-origin';
import { authSchema } from './auth-schema';
import { sendMagicLink, sendSignInCode } from './mail';

export const authSecret =
  process.env.BETTER_AUTH_SECRET ?? 'dev-secret-dev-secret-dev-secret';

function mailedSignInLink(verifyURL: string, token: string): string {
  let callback: string | null;
  try {
    callback = new URL(verifyURL).searchParams.get('callbackURL');
  } catch {
    return verifyURL;
  }
  if (!callback) {
    return verifyURL;
  }
  let page: URL;
  try {
    page = new URL(callback);
  } catch {
    return verifyURL;
  }
  if (!previewOriginAllowed(page.origin)) {
    return verifyURL;
  }
  page.searchParams.set('sign-in', token);
  return page.toString();
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: hostedApiOrigin(),
  trustedOrigins: trustedPreviewOrigins(),
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  plugins: [
    bearer(),
    emailOTP({
      storeOTP: 'hashed',
      async sendVerificationOTP({ email, otp, type }) {
        switch (type) {
          case 'sign-in':
            await sendSignInCode(email, otp);
            return;
          case 'email-verification':
          case 'forget-password':
          case 'change-email':
            return;
          default: {
            const unreachable: never = type;
            return unreachable;
          }
        }
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        await sendMagicLink(email, mailedSignInLink(url, token));
      },
    }),
    organization(),
  ],
});
