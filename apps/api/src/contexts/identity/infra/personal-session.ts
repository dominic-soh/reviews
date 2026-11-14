import { parseSetCookieHeader } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { auth } from './auth';

export type IssuedSession = { setCookie: string; bearerToken: string };

export async function issuePersonalSession(
  authUserId: string,
): Promise<IssuedSession> {
  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createSession(
    authUserId,
    false,
    { loginKind: 'personal' },
    true,
  );
  const cookie = ctx.authCookies.sessionToken;
  const setCookie = await serializeSignedCookie(
    cookie.name,
    created.token,
    ctx.secret,
    { ...cookie.attributes, maxAge: ctx.sessionConfig.expiresIn },
  );
  const bearerToken = parseSetCookieHeader(setCookie).get(cookie.name)?.value;
  if (!bearerToken) {
    throw new Error('signed session cookie did not round-trip');
  }
  return { setCookie, bearerToken };
}
