/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        abby: {
          coral: '#FF6B4A',
          sky: '#00B4D8',
          ink: '#1A202C',
          muted: '#64748B',
          cream: '#FAF9F6',
          soft: '#F4F7F6',
          'sky-ink': '#00566B',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'abby-pulse-glow': {
          '0%, 100%': {
            boxShadow:
              '0 0 0 0 rgba(255, 107, 74, 0.55), 0 0 0 0 rgba(0, 180, 216, 0.35)',
          },
          '50%': {
            boxShadow:
              '0 0 0 10px rgba(255, 107, 74, 0), 0 0 18px 6px rgba(0, 180, 216, 0.35)',
          },
        },
        'abby-send-bounce': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.08)' },
          '70%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        'abby-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'abby-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'abby-pulse-glow': 'abby-pulse-glow 1.4s ease-in-out infinite',
        'abby-send-bounce': 'abby-send-bounce 420ms ease-out',
        'abby-fade-up': 'abby-fade-up 280ms ease-out both',
        'abby-float': 'abby-float 5.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
