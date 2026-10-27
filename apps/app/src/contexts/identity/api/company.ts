// @ts-expect-error Lynx reads this import as a thread directive. It is not a package.
import 'background-only';

import {
  type CompanyActor,
  companyActorSchema,
  type InvitableRole,
  type Invitation,
  invitationSchema,
  inviteConflictSchema,
  type Member,
  type MyInvitation,
  memberSchema,
  myInvitationSchema,
} from '@reviews/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  authHeaders,
  forgetSession,
  prepareSession,
  rememberSession,
} from './session-carry';

export type { InvitableRole, Invitation, MyInvitation };

export type CompanySession =
  | { kind: 'signed-out' }
  | { kind: 'onboarding' }
  | { kind: 'company'; actor: CompanyActor };

export type InviteOutcome =
  | 'invited'
  | 'already-member'
  | 'already-invited'
  | 'invalid'
  | 'failed';

export type CreateCompanyResult = 'created' | 'taken' | 'failed';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

type LynxPage = {
  originUrl?: string;
  queryItems?: Record<string, string | undefined>;
};

function lynxPage(): LynxPage | undefined {
  const runtime = globalThis as {
    lynx?: { __globalProps?: LynxPage };
  };
  return runtime.lynx?.__globalProps;
}

function hrefOf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const href = (value as { href?: unknown }).href;
  if (typeof href !== 'string' || !href.startsWith('http')) {
    return undefined;
  }
  if (href.includes('/static/js/')) {
    return undefined;
  }
  return href;
}

function browserHref(): string | undefined {
  const runtime = globalThis as {
    document?: { location?: unknown };
    window?: { location?: unknown };
    location?: unknown;
  };
  return (
    hrefOf(runtime.document?.location) ??
    hrefOf(runtime.window?.location) ??
    hrefOf(runtime.location)
  );
}

function signInFromHref(href: string): string | undefined {
  try {
    return new URL(href).searchParams.get('sign-in') ?? undefined;
  } catch {
    return undefined;
  }
}

function withoutSignIn(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('sign-in');
  return url.toString();
}

function bundleURL(): string | undefined {
  const prefix = import.meta.env.ASSET_PREFIX;
  if (
    typeof prefix !== 'string' ||
    !prefix.startsWith('http') ||
    prefix.includes('<port>')
  ) {
    return undefined;
  }
  const base = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const url = new URL('main.lynx.bundle', base);
  url.searchParams.set('fullscreen', 'true');
  return url.toString();
}

function pageURL(): string | undefined {
  const href = browserHref();
  if (href) {
    return withoutSignIn(href);
  }
  const originUrl = lynxPage()?.originUrl;
  if (originUrl?.startsWith('http')) {
    return withoutSignIn(originUrl);
  }
  return bundleURL();
}

function readSignInToken(): string | undefined {
  const fromProps = lynxPage()?.queryItems?.['sign-in'];
  if (fromProps) {
    return fromProps;
  }
  const hrefs = [browserHref(), lynxPage()?.originUrl];
  for (const href of hrefs) {
    if (!href) {
      continue;
    }
    const token = signInFromHref(href);
    if (token) {
      return token;
    }
  }
  return undefined;
}

async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  await prepareSession();
  const headers = new Headers(init?.headers);
  const tokenHeaders = authHeaders();
  const hadToken = Object.keys(tokenHeaders).length > 0;
  for (const [key, value] of Object.entries(tokenHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
  rememberSession(response);
  if (hadToken && response.status === 401) {
    forgetSession();
  }
  return response;
}

let signInConsumed = false;

async function consumeSignInLink(): Promise<void> {
  if (signInConsumed) {
    return;
  }
  signInConsumed = true;
  const token = readSignInToken();
  if (!token) {
    return;
  }
  try {
    await authedFetch(
      `${__API_BASE__}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
    );
  } catch {
    return;
  }
}

async function loadCompanySession(): Promise<CompanySession> {
  await consumeSignInLink();
  try {
    const response = await authedFetch(`${__API_BASE__}/company-actor`);
    switch (response.status) {
      case 401:
        return { kind: 'signed-out' };
      case 403:
        return { kind: 'onboarding' };
      case 200:
        return {
          kind: 'company',
          actor: companyActorSchema.parse(await response.json()),
        };
      default:
        return { kind: 'signed-out' };
    }
  } catch {
    return { kind: 'signed-out' };
  }
}

export function useCompanySession() {
  return useQuery({
    queryKey: ['company-actor'],
    retry: false,
    queryFn: loadCompanySession,
  });
}

export async function signOut(): Promise<void> {
  try {
    await authedFetch(`${__API_BASE__}/api/auth/sign-out`, { method: 'POST' });
  } catch {
    return;
  } finally {
    forgetSession();
  }
}

async function loadMembers(): Promise<Member[]> {
  const response = await authedFetch(`${__API_BASE__}/members`);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return memberSchema.array().parse(await response.json());
}

export function useMembers(enabled: boolean) {
  return useQuery({
    queryKey: ['members'],
    enabled,
    retry: false,
    queryFn: loadMembers,
  });
}

async function loadPendingInvites(): Promise<Invitation[]> {
  const response = await authedFetch(`${__API_BASE__}/invites`);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return invitationSchema.array().parse(await response.json());
}

export function usePendingInvites(enabled: boolean) {
  return useQuery({
    queryKey: ['invites'],
    enabled,
    retry: false,
    queryFn: loadPendingInvites,
  });
}

async function loadMyInvites(): Promise<MyInvitation[]> {
  const response = await authedFetch(`${__API_BASE__}/my-invites`);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return myInvitationSchema.array().parse(await response.json());
}

export function useMyInvites(enabled: boolean) {
  return useQuery({
    queryKey: ['my-invites'],
    enabled,
    retry: false,
    queryFn: loadMyInvites,
  });
}

async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<Response | null> {
  try {
    return await authedFetch(`${__API_BASE__}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

function magicLinkBody(email: string): {
  email: string;
  callbackURL?: string;
} {
  const page = pageURL();
  if (!page) {
    return { email };
  }
  return { email, callbackURL: page };
}

export async function requestMagicLink(email: string): Promise<boolean> {
  try {
    const response = await authedFetch(
      `${__API_BASE__}/api/auth/sign-in/magic-link`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(magicLinkBody(email)),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function requestSignInCode(email: string): Promise<boolean> {
  try {
    const response = await authedFetch(
      `${__API_BASE__}/api/auth/email-otp/send-verification-otp`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, type: 'sign-in' }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function submitSignInCode(
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    const response = await authedFetch(
      `${__API_BASE__}/api/auth/sign-in/email-otp`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function createCompany(
  name: string,
  slug: string,
): Promise<CreateCompanyResult> {
  const response = await request('/companies', 'POST', { name, slug });
  if (!response) {
    return 'failed';
  }
  if (response.ok) {
    return 'created';
  }
  if (response.status === 409) {
    return 'taken';
  }
  return 'failed';
}

export async function inviteMember(
  email: string,
  role: InvitableRole,
): Promise<InviteOutcome> {
  const response = await request('/invites', 'POST', { email, role });
  if (!response) {
    return 'failed';
  }
  if (response.ok) {
    return 'invited';
  }
  if (response.status === 400) {
    return 'invalid';
  }
  if (response.status !== 409) {
    return 'failed';
  }
  const body = inviteConflictSchema.safeParse(await response.json());
  if (!body.success) {
    return 'failed';
  }
  switch (body.data.reason) {
    case 'member':
      return 'already-member';
    case 'invited':
      return 'already-invited';
    default: {
      const unreachable: never = body.data.reason;
      return unreachable;
    }
  }
}

export async function acceptInvite(invitationId: string): Promise<boolean> {
  const response = await request(`/invites/${invitationId}/accept`, 'POST');
  return response?.ok ?? false;
}

export async function setManager(
  membershipId: string,
  managerMembershipId: string | null,
): Promise<boolean> {
  const response = await request(
    `/memberships/${membershipId}/manager`,
    'PUT',
    { managerMembershipId },
  );
  return response?.ok ?? false;
}

export async function setMembershipRole(
  membershipId: string,
  role: InvitableRole,
): Promise<boolean> {
  const response = await request(`/memberships/${membershipId}`, 'PATCH', {
    role,
  });
  return response?.ok ?? false;
}

export function isInviteEmail(value: string): boolean {
  return invitationSchema.shape.email.safeParse(value).success;
}
