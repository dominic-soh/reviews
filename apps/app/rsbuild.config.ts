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

const signInPropsScript = `(function(){try{var params=new URLSearchParams(location.search);var token=params.get("sign-in");if(!token)return;var key="lynx-web-core-global-props";var props={};try{props=JSON.parse(localStorage.getItem(key)||"{}")||{}}catch(e){props={}}var items=props.queryItems||{};items["sign-in"]=token;props.queryItems=items;localStorage.setItem(key,JSON.stringify(props));}catch(e){}})();`;

function isPreviewDocument(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0];
  return path === '/__web_preview' || path === '/__web_preview/';
}

function withSignInScript(body: string): string {
  if (body.includes('lynx-web-core-global-props')) {
    return body;
  }
  if (!body.includes('<head>')) {
    return body;
  }
  return body.replace('<head>', `<head><script>${signInPropsScript}</script>`);
}

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
    setup({ action, server }) {
      if (action !== 'dev') {
        return;
      }
      server.middlewares.use((req, res, next) => {
        if (!isPreviewDocument(req.url)) {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        const end = res.end.bind(res);
        res.write = ((chunk: unknown) => {
          if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
            chunks.push(Buffer.from(chunk));
          }
          return true;
        }) as typeof res.write;
        res.end = ((chunk?: unknown) => {
          if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
            chunks.push(Buffer.from(chunk));
          }
          const body = withSignInScript(Buffer.concat(chunks).toString('utf8'));
          res.setHeader('content-length', Buffer.byteLength(body));
          return end(body);
        }) as typeof res.end;
        next();
      });
    },
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
  html: {
    tags: [
      {
        tag: 'script',
        head: true,
        append: false,
        // The web preview loads the bundle by casename and drops every other
        // query param. Lynx reads this global props object on startup.
        children: signInPropsScript,
      },
    ],
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
