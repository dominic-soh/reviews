import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const compilerRules = reactHooks.configs['recommended-latest'].rules;

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: compilerRules,
  },
];
