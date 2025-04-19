import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      colors: {
        'abz-purple': '#6339F5',
        'abz-purple-dark': '#5128D4',
        'abz-blue-dark': '#0D1B42',
        'abz-blue': '#005dff',
        'abz-background': '#F5F5F5',
        'abz-light-blue': '#E0F2FE',
        'abz-text-dark': '#111111',
        'abz-text-black': '#000000',
        'abz-green': '#10B981',
        'abz-green-dark': '#059669',
        'abz-red': '#EF4444',
        'abz-red-dark': '#DC2626',
        'abz-yellow': '#F59E0B',
        'abz-yellow-dark': '#D97706',
        'abz-orange': '#F97316',
        'abz-orange-dark': '#EA580C',
        'abz-pink': '#EC4899',
        'abz-pink-dark': '#DB2777',
        'abz-cyan': '#06B6D4',
        'abz-cyan-dark': '#0891B2',
        'abz-teal': '#14B8A6',
        'abz-teal-dark': '#0D9488',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#333',
            a: {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
          },
        },
      },
    },
  },
  plugins: [typography],
  safelist: [
    {
      pattern: /^(bg|text|border)-abz-.*/,
    }
  ]
};

export default config;