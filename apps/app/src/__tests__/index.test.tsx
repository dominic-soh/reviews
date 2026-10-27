import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from '../App';
import { SignIn } from '../contexts/identity/screens/SignIn';

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

test('sign-in code is six digits', async () => {
  const { findByText } = render(
    <SignIn
      email="ada@demo.test"
      code="12345"
      step="code"
      notice=""
      onChange={() => undefined}
      onCodeChange={() => undefined}
      onSubmitLink={() => undefined}
      onRequestCode={() => undefined}
      onSubmitCode={() => undefined}
      onReset={() => undefined}
    />,
  );
  expect(await findByText('Enter the 6-digit code')).toBeInTheDocument();
  expect(await findByText('Sign in')).toBeInTheDocument();
});
