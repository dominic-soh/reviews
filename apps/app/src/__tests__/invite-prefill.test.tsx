import '@testing-library/jest-dom';
import { fireEvent, render } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from '../App';

type RecordedCall = {
  url: string;
  body: unknown;
};

function mockFetch(respond: (call: RecordedCall) => Response): {
  fetch: typeof fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const fakeFetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const call: RecordedCall = { url, body };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fetch: fakeFetch, calls };
}

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

test('an invited email in the page query prefills the sign-in field', async () => {
  const invitedEmail = 'bea@new.test';
  window.history.pushState(
    {},
    '',
    `/?email=${encodeURIComponent(invitedEmail)}`,
  );

  const { fetch: fakeFetch, calls } = mockFetch((call) => {
    if (call.url.endsWith('/company-actor')) {
      return new Response(null, { status: 401 });
    }
    if (call.url.endsWith('/api/auth/sign-in/magic-link')) {
      return new Response(JSON.stringify({}), { status: 200 });
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

    expect(await findByText('Welcome to Reviews')).toBeInTheDocument();

    const sendLink = await findByText('Send sign-in link');
    fireEvent.tap(sendLink);

    await findByText('Check your email');

    const magicLinkCall = calls.find((call) =>
      call.url.endsWith('/api/auth/sign-in/magic-link'),
    );
    expect((magicLinkCall?.body as { email?: string } | undefined)?.email).toBe(
      invitedEmail,
    );
  });
});
