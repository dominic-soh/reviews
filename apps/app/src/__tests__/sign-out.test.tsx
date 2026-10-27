import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from '../App';
import { forgetSession } from '../contexts/identity/api/session-carry';

type RecordedCall = {
  url: string;
  method: string;
  headers: Headers;
};

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function mockFetch(respond: (call: RecordedCall) => Response): {
  fetch: typeof fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const fakeFetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const call: RecordedCall = {
      url: urlOf(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fetch: fakeFetch, calls };
}

function jsonResponse(
  body: unknown,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const ownerActorBody = {
  membershipId: 'ada',
  companyId: 'co_1',
  role: 'owner',
  companyName: 'Demo',
  slug: 'demo',
};

function withMockedFetch<T>(
  fetchImpl: typeof fetch,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test('pressing sign out calls the endpoint, drops the token, and shows sign-in', async () => {
  forgetSession();
  let companyActorCalls = 0;
  const { fetch: fakeFetch, calls } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      companyActorCalls += 1;
      if (companyActorCalls === 1) {
        return jsonResponse(ownerActorBody, { 'set-auth-token': 'token-a' });
      }
      return new Response(null, { status: 401 });
    }
    if (call.url.endsWith('/members') || call.url.endsWith('/invites')) {
      return jsonResponse([]);
    }
    if (call.url.endsWith('/api/auth/sign-out')) {
      return jsonResponse({ success: true });
    }
    return new Response(null, { status: 404 });
  });

  await withMockedFetch(fakeFetch, async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { findByText } = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );

    const signOutButton = await findByText('Sign out');
    fireEvent.tap(signOutButton);

    expect(await findByText('Welcome to Reviews')).toBeInTheDocument();

    const signOutCall = calls.find((call) =>
      call.url.endsWith('/api/auth/sign-out'),
    );
    expect(signOutCall?.method).toBe('POST');
    expect(signOutCall?.headers.has('authorization')).toBe(true);

    const companyActorCallsSeen = calls.filter((call) =>
      call.url.endsWith('/company-actor'),
    );
    expect(companyActorCallsSeen.length).toBeGreaterThan(1);
    expect(companyActorCallsSeen.at(-1)?.headers.has('authorization')).toBe(
      false,
    );
  });
});

test('a 401 on an authed request clears the stored token', async () => {
  forgetSession();
  let companyActorCalls = 0;
  const { fetch: fakeFetch, calls } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      companyActorCalls += 1;
      if (companyActorCalls === 1) {
        return jsonResponse(ownerActorBody, { 'set-auth-token': 'token-b' });
      }
      return new Response(null, { status: 401 });
    }
    if (call.url.endsWith('/members') || call.url.endsWith('/invites')) {
      return jsonResponse([]);
    }
    return new Response(null, { status: 404 });
  });

  await withMockedFetch(fakeFetch, async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { findByText } = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );

    expect(await findByText('Demo')).toBeInTheDocument();
    const firstCompanyActorCall = calls.find((call) =>
      call.url.endsWith('/company-actor'),
    );
    expect(firstCompanyActorCall?.headers.has('authorization')).toBe(false);

    await client.invalidateQueries({ queryKey: ['company-actor'] });
    expect(await findByText('Welcome to Reviews')).toBeInTheDocument();

    const callsAfter401 = calls.filter((call) =>
      call.url.endsWith('/company-actor'),
    );
    expect(callsAfter401).toHaveLength(2);
    expect(callsAfter401[1]?.headers.has('authorization')).toBe(true);

    await client.invalidateQueries({ queryKey: ['company-actor'] });
    await waitFor(() => {
      expect(
        calls.filter((call) => call.url.endsWith('/company-actor')),
      ).toHaveLength(3);
    });

    const thirdCompanyActorCall = calls
      .filter((call) => call.url.endsWith('/company-actor'))
      .at(2);
    expect(thirdCompanyActorCall?.headers.has('authorization')).toBe(false);
  });
});
