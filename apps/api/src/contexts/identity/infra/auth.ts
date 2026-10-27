import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, emailOTP, magicLink, organization } from 'better-auth/plugins';
import {
  authConfig,
  isOriginAllowed,
  trustedOrigins,
} from '../../../auth-config';
import { db } from '../../../db';
import { authSchema } from './auth-schema';
import { sendMagicLink, sendSignInCode } from './mail';

export const authSecret = authConfig.secret;

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
  if (!isOriginAllowed(authConfig, page.origin)) {
    return verifyURL;
  }
  page.searchParams.set('sign-in', token);
  return page.toString();
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: authConfig.baseURL,
  trustedOrigins: trustedOrigins(authConfig),
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  session: {
    additionalFields: {
      loginKind: {
        type: 'string',
        defaultValue: 'company',
        input: false,
        fieldName: 'loginKind',
      },
    },
  },
  plugins: [
    bearer(),
    emailOTP({
      otpLength: 6,
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
