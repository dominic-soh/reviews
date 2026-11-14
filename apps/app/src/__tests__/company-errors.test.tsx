import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@lynx-js/react/testing-library';
import { memberSchema } from '@reviews/contracts';
import { expect, test } from '@rstest/core';
import { QueryClientProvider } from '@tanstack/react-query';

import { App } from '../App';
import { forgetSession } from '../contexts/identity/api/session-carry';
import { createQueryClient } from '../query-client';

type RecordedCall = {
  url: string;
  method: string;
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

const members = memberSchema.array().parse([
  {
    membershipId: 'ada',
    name: 'Ada',
    email: 'ada@demo.test',
    role: 'owner',
    managerMembershipId: null,
  },
]);

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

test('a 500 from members shows an error and retry restores the list', async () => {
  forgetSession();
  let memberCalls = 0;
  const { fetch: fakeFetch } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      return jsonResponse(ownerActorBody, { 'set-auth-token': 'token-a' });
    }
    if (call.url.endsWith('/members')) {
      memberCalls += 1;
      if (memberCalls === 1) {
        return new Response(null, { status: 500 });
      }
      return jsonResponse(members);
    }
    if (call.url.endsWith('/invites')) {
      return jsonResponse([]);
    }
    return new Response(null, { status: 404 });
  });

  await withMockedFetch(fakeFetch, async () => {
    const client = createQueryClient();
    const { findByText } = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );

    const retryButton = await findByText('Try again');
    expect(await findByText('Could not load your team.')).toBeInTheDocument();

    fireEvent.tap(retryButton);

    expect(await findByText('Ada')).toBeInTheDocument();
    expect(memberCalls).toBe(2);
  });
});

test('a 401 from members signs the app out', async () => {
  forgetSession();
  let companyActorCalls = 0;
  const { fetch: fakeFetch } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      companyActorCalls += 1;
      if (companyActorCalls === 1) {
        return jsonResponse(ownerActorBody, { 'set-auth-token': 'token-b' });
      }
      return new Response(null, { status: 401 });
    }
    if (call.url.endsWith('/members')) {
      return new Response(null, { status: 401 });
    }
    if (call.url.endsWith('/invites')) {
      return jsonResponse([]);
    }
    return new Response(null, { status: 404 });
  });

  await withMockedFetch(fakeFetch, async () => {
    const client = createQueryClient();
    const { findByText } = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(companyActorCalls).toBeGreaterThan(1);
    });
    expect(await findByText('Welcome to Reviews')).toBeInTheDocument();
  });
});

test('a 500 from my-invites during onboarding shows an error, not create-company', async () => {
  forgetSession();
  const { fetch: fakeFetch } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      return new Response(null, { status: 403 });
    }
    if (call.url.endsWith('/my-invites')) {
      return new Response(null, { status: 500 });
    }
    return new Response(null, { status: 404 });
  });

  await withMockedFetch(fakeFetch, async () => {
    const client = createQueryClient();
    const { findByText, queryByText } = render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );

    expect(
      await findByText('Could not load your invites.'),
    ).toBeInTheDocument();
    expect(await findByText('Try again')).toBeInTheDocument();
    expect(queryByText('Create company')).toBeNull();
  });
});
