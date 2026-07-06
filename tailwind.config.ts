import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#fafafa',
        surface: '#f4f4f4',
        raised: '#ebebeb',
        line: '#e0e0e0',
        'line-hover': '#c8c8c8',
        dim: '#888888',
        accent: '#111111',
      },
    },
  },
  plugins: [],
};

export default config;
