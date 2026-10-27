import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { db } from '../../../db';
import { type LoginKind, loginKind } from '../domain/login-kind';
import { auth } from '../infra/auth';
import { session as sessionTable } from '../infra/auth-schema';

export type SignedInUser = {
  authUserId: string;
  email: string;
  name: string;
  organizationId: string | null;
  loginKind: LoginKind;
};

function headersWithBearer(headers: Headers): Headers {
  const authorization = headers.get('authorization');
  if (!authorization) {
    return headers;
  }
  const prefix = 'bearer ';
  if (!authorization.toLowerCase().startsWith(prefix)) {
    return headers;
  }
  const token = authorization.slice(prefix.length).trim();
  if (!token) {
    return headers;
  }
  const pair = `better-auth.session_token=${token}`;
  const cookie = headers.get('cookie');
  if (!cookie) {
    headers.set('cookie', pair);
    return headers;
  }
  const kept = cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => !part.startsWith('better-auth.session_token='));
  kept.push(pair);
  headers.set('cookie', kept.join('; '));
  return headers;
}

export async function signedInUser(c: Context): Promise<SignedInUser | null> {
  const headers = headersWithBearer(new Headers(c.req.raw.headers));
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }
  const rows = await db
    .select({ loginKind: sessionTable.loginKind })
    .from(sessionTable)
    .where(eq(sessionTable.id, session.session.id));
  return {
    authUserId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: session.session.activeOrganizationId ?? null,
    loginKind: loginKind(rows[0]?.loginKind ?? 'company'),
  };
}
