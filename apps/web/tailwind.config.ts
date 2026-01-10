import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme base colors
        background: '#0d1117',
        foreground: '#c9d1d9',
        card: {
          DEFAULT: '#161b22',
          foreground: '#c9d1d9',
        },
        popover: {
          DEFAULT: '#1c2128',
          foreground: '#c9d1d9',
        },
        primary: {
          DEFAULT: '#58a6ff',
          foreground: '#0d1117',
        },
        secondary: {
          DEFAULT: '#21262d',
          foreground: '#c9d1d9',
        },
        muted: {
          DEFAULT: '#30363d',
          foreground: '#8b949e',
        },
        accent: {
          DEFAULT: '#238636',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#f85149',
          foreground: '#ffffff',
        },
        border: '#30363d',
        input: '#21262d',
        ring: '#58a6ff',

        // WoW Class colors
        wow: {
          druid: '#FF7C0A',
          hunter: '#AAD372',
          mage: '#3FC7EB',
          paladin: '#F48CBA',
          priest: '#FFFFFF',
          rogue: '#FFF468',
          shaman: '#0070DD',
          warlock: '#8788EE',
          warrior: '#C69B6D',
        },

        // Item quality colors
        quality: {
          poor: '#9d9d9d',
          common: '#ffffff',
          uncommon: '#1eff00',
          rare: '#0070dd',
          epic: '#a335ee',
          legendary: '#ff8000',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
