import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { withLynxConfig } from '@lynx-js/react/testing-library/rstest-config';
import { defineConfig } from '@rstest/core';

const require = createRequire(import.meta.url);
const backgroundOnly = fileURLToPath(
  new URL('./src/background-only-stub.ts', import.meta.url),
);

export default defineConfig({
  extends: withLynxConfig({
    modifyRstestConfig(config) {
      const setupFiles = config.setupFiles ?? [];
      const files = Array.isArray(setupFiles) ? setupFiles : [setupFiles];
      return {
        ...config,
        setupFiles: [...files, './src/__tests__/setup.ts'],
      };
    },
  }),
  resolve: {
    alias: {
      'background-only': backgroundOnly,
      react: require.resolve('@lynx-js/react'),
    },
  },
});
