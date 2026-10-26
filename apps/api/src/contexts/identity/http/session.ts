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

export async function signedInUser(c: Context): Promise<SignedInUser | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
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
