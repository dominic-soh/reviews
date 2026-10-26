import preset from '@lynx-js/tailwind-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,tsx}'],
  presets: [preset],
};

export default config;
