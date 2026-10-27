import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { db } from '../../../db';
import { companyActorForAuthUser } from '../application/company-actor';
import type { CompanyActor } from '../domain/company-actor';
import { loginKind } from '../domain/login-kind';
import { auth } from '../infra/auth';
import { session as sessionTable } from '../infra/auth-schema';

type SessionUser = {
  authUserId: string;
  email: string;
  name: string;
};

export type CompanyLogin = SessionUser & {
  kind: 'company';
  organizationId: string | null;
};

export type PersonalLogin = SessionUser & { kind: 'personal' };

export type SignedInUser = CompanyLogin | PersonalLogin;

type Refusal = {
  ok: false;
  status: 401 | 403;
  error: 'unauthenticated' | 'personal' | 'company' | 'no membership';
};

type Admission<T> = { ok: true; value: T } | Refusal;

async function signedInUser(c: Context): Promise<SignedInUser | null> {
  const found = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!found) {
    return null;
  }
  const rows = await db
    .select({ loginKind: sessionTable.loginKind })
    .from(sessionTable)
    .where(eq(sessionTable.id, found.session.id));
  const user = {
    authUserId: found.user.id,
    email: found.user.email,
    name: found.user.name,
  };
  const kind = loginKind(rows[0]?.loginKind);
  switch (kind) {
    case 'company':
      return {
        ...user,
        kind,
        organizationId: found.session.activeOrganizationId ?? null,
      };
    case 'personal':
      return { ...user, kind };
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

async function admitCompanyLogin(c: Context): Promise<Admission<CompanyLogin>> {
  const user = await signedInUser(c);
  if (!user) {
    return { ok: false, status: 401, error: 'unauthenticated' };
  }
  switch (user.kind) {
    case 'company':
      return { ok: true, value: user };
    case 'personal':
      return { ok: false, status: 403, error: 'personal' };
    default: {
      const unreachable: never = user;
      return unreachable;
    }
  }
}

async function admitCompanyActor(
  c: Context,
): Promise<Admission<{ user: CompanyLogin; actor: CompanyActor }>> {
  const login = await admitCompanyLogin(c);
  if (!login.ok) {
    return login;
  }
  const actor = await companyActorForAuthUser(
    login.value.authUserId,
    login.value.organizationId,
  );
  if (!actor) {
    return { ok: false, status: 403, error: 'no membership' };
  }
  return { ok: true, value: { user: login.value, actor } };
}

async function admitPersonalLogin(
  c: Context,
): Promise<Admission<PersonalLogin>> {
  const user = await signedInUser(c);
  if (!user) {
    return { ok: false, status: 401, error: 'unauthenticated' };
  }
  switch (user.kind) {
    case 'personal':
      return { ok: true, value: user };
    case 'company':
      return { ok: false, status: 403, error: 'company' };
    default: {
      const unreachable: never = user;
      return unreachable;
    }
  }
}

export const companyLogin = createMiddleware<{
  Variables: { user: CompanyLogin };
}>(async (c, next) => {
  const admission = await admitCompanyLogin(c);
  if (!admission.ok) {
    return c.json({ error: admission.error }, admission.status);
  }
  c.set('user', admission.value);
  await next();
});

export const companyActor = createMiddleware<{
  Variables: { user: CompanyLogin; actor: CompanyActor };
}>(async (c, next) => {
  const admission = await admitCompanyActor(c);
  if (!admission.ok) {
    return c.json({ error: admission.error }, admission.status);
  }
  c.set('user', admission.value.user);
  c.set('actor', admission.value.actor);
  await next();
});

export const personalLogin = createMiddleware<{
  Variables: { user: PersonalLogin };
}>(async (c, next) => {
  const admission = await admitPersonalLogin(c);
  if (!admission.ok) {
    return c.json({ error: admission.error }, admission.status);
  }
  c.set('user', admission.value);
  await next();
});
