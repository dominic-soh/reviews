import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { pluginTailwindCSS } from 'rsbuild-plugin-tailwindcss';

const require = createRequire(import.meta.url);
const backgroundOnly = fileURLToPath(
  new URL('./src/background-only-stub.ts', import.meta.url),
);

const compilerOn = process.env.REACT_COMPILER !== '0';

const babel = pluginBabel({
  include: /\.(?:jsx|tsx)$/,
  babelLoaderOptions(opts) {
    opts.plugins ??= [];
    opts.plugins.unshift(['babel-plugin-react-compiler', { target: '17' }]);
  },
});

export default defineConfig({
  environments: {
    lynx: {},
    web: {},
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      preact: require.resolve('preact'),
      'preact/hooks': require.resolve('preact/hooks'),
      react: require.resolve('@lynx-js/react'),
      'react/jsx-runtime': require.resolve('@lynx-js/react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve(
        '@lynx-js/react/jsx-dev-runtime',
      ),
      'background-only': backgroundOnly,
    },
  },
  source: {
    entry: {
      main: './src/index.tsx',
    },
    define: {
      __API_BASE__: JSON.stringify(
        process.env.API_BASE ?? 'http://127.0.0.1:3001',
      ),
    },
  },
  plugins: [
    ...(compilerOn ? [babel] : []),
    pluginQRCode({
      schema(url) {
        return `${url}?fullscreen=true`;
      },
    }),
    pluginReactLynx({
      // The published encoder rejects anything above 3.9. Raise this when a
      // compiler that can emit 4.1 is published. Host apps must stay at or
      // above this value.
      engineVersion: '3.9',
      enableCSSInheritance: true,
    }),
    pluginTailwindCSS({
      config: 'tailwind.config.ts',
      exclude: [/node_modules/],
    }),
    pluginTypeCheck(),
  ],
});
