// @ts-expect-error Lynx reads this import as a thread directive. It is not a package.
import 'background-only';

import {
  type CompanyActor,
  companyActorSchema,
  type Member,
  memberSchema,
} from '@reviews/contracts';
import { useQuery } from '@tanstack/react-query';

export type CompanySession =
  | { kind: 'signed-out' }
  | { kind: 'onboarding' }
  | { kind: 'company'; actor: CompanyActor };

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

export async function requestMagicLink(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${__API_BASE__}/api/auth/sign-in/magic-link`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function postJson(path: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${__API_BASE__}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function createCompany(name: string, slug: string): Promise<boolean> {
  return postJson('/companies', { name, slug });
}

export function inviteMember(email: string): Promise<boolean> {
  return postJson('/invites', { email, role: 'member' });
}
