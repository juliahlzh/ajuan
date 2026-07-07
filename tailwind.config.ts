import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        finance: '#0f766e',
        warning: '#b7791f',
        danger: '#b42318'
      }
    }
  },
  plugins: []
};

export default config;
