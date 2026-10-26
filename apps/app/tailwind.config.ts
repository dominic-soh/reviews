import { createLynxPreset } from '@lynx-js/tailwind-preset';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const theme = {
  extend: {
    fontFamily: {
      sans: ['-apple-system', 'system-ui', 'sans-serif'],
    },
  },
};

const lynxPreset = createLynxPreset({
  theme,
});

const config: Config = {
  content: ['./src/**/*.{js,ts,tsx}'],
  presets: [lynxPreset],
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.cursor-pointer': { cursor: 'pointer' },
        '.cursor-default': { cursor: 'default' },
        '.cursor-not-allowed': { cursor: 'not-allowed' },
        '.cursor-text': { cursor: 'text' },
      });
    }),
  ],
};

export default config;
