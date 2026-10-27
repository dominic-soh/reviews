import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from '../App';

test('App', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { findByText } = render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  expect(await findByText('Welcome to Reviews')).toBeInTheDocument();
  expect(await findByText('Send sign-in link')).toBeInTheDocument();
  expect(await findByText('Email me a code')).toBeInTheDocument();
});
