import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { withLynxConfig } from '@lynx-js/react/testing-library/rstest-config';
import { defineConfig } from '@rstest/core';

const require = createRequire(import.meta.url);
const backgroundOnly = fileURLToPath(
  new URL('./src/background-only-stub.ts', import.meta.url),
);

export default defineConfig({
  extends: withLynxConfig(),
  resolve: {
    alias: {
      'background-only': backgroundOnly,
      react: require.resolve('@lynx-js/react'),
    },
  },
});
