/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper + ink palette. Single confident accent (forest green),
        // a sparing warm secondary (ochre) for achievements/XP.
        bg: '#f7f4ee', // warm paper
        panel: '#ffffff', // card / surface
        panel2: '#f1ece2', // sunken surface (inputs, segments)
        border: '#e4ded2', // soft hairline
        muted: '#8c857a', // warm gray secondary text
        ink: '#262220', // primary text
        accent: '#2f6f57', // forest green (primary)
        accent2: '#9c6b3f', // ochre / clay (secondary, rare)
        ok: '#2f7d52',
        warn: '#b07d12',
        danger: '#b3402f',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(38, 34, 32, 0.04), 0 4px 14px rgba(38, 34, 32, 0.06)',
        lift: '0 12px 30px rgba(38, 34, 32, 0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        pulse2: 'pulse2 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
