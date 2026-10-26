import type { Context } from 'hono';
import { auth } from '../infra/auth';

export type SignedInUser = {
  authUserId: string;
  email: string;
  name: string;
  organizationId: string | null;
};

export async function signedInUser(c: Context): Promise<SignedInUser | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return null;
  }
  return {
    authUserId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: session.session.activeOrganizationId ?? null,
  };
}
