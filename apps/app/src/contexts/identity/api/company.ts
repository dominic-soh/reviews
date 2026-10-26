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

async function loadCompanySession(): Promise<CompanySession> {
  try {
    const response = await fetch(`${__API_BASE__}/company-actor`, {
      credentials: 'include',
    });
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

async function loadMembers(): Promise<Member[]> {
  try {
    const response = await fetch(`${__API_BASE__}/members`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return [];
    }
    return memberSchema.array().parse(await response.json());
  } catch {
    return [];
  }
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
  try {
    const response = await fetch(`${__API_BASE__}/invites`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return [];
    }
    return invitationSchema.array().parse(await response.json());
  } catch {
    return [];
  }
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
  try {
    const response = await fetch(`${__API_BASE__}/my-invites`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return [];
    }
    return myInvitationSchema.array().parse(await response.json());
  } catch {
    return [];
  }
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
    return await fetch(`${__API_BASE__}${path}`, {
      method,
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

export async function requestMagicLink(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${__API_BASE__}/api/auth/sign-in/magic-link`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
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
