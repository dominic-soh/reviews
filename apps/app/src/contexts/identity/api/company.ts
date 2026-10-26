// @ts-expect-error Lynx reads this import as a thread directive. It is not a package.
import 'background-only';

import { type CompanyActor, companyActorSchema } from '@reviews/contracts';
import { useQuery } from '@tanstack/react-query';

async function loadCompanyActor(): Promise<CompanyActor | null> {
  try {
    const response = await fetch(`${__API_BASE__}/company-actor`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    return companyActorSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export function useCompanyActor() {
  return useQuery({
    queryKey: ['company-actor'],
    retry: false,
    queryFn: loadCompanyActor,
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
