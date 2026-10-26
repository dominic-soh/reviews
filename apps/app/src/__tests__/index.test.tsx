import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';

import { App } from '../App';

test('App', async () => {
  const { findByText } = render(<App />);
  const element = await findByText('Reviews');

  expect(element).toBeInTheDocument();
});
