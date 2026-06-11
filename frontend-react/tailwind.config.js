/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Schibsted Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#6366f1',
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease both',
        'slide-up': 'slideUp 0.3s ease both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(.34,1.56,.64,1) both',
        'pulse-dot': 'pulseDot 1.5s infinite',
        'count-up': 'countUp 0.4s ease both',
        'shimmer': 'shimmer 1.4s infinite',
        'float-slow': 'floatSlow 14s ease-in-out infinite alternate',
        'float-slower': 'floatSlow 20s ease-in-out infinite alternate-reverse',
      },
      keyframes: {
        floatSlow: {
          from: { transform: 'translate(0, 0) scale(1)' },
          to:   { transform: 'translate(40px, -30px) scale(1.15)' },
        },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseDot: { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.5', transform: 'scale(.8)' } },
        countUp:  { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer:  { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99,102,241,0.3)',
        'glow-sm': '0 0 10px rgba(99,102,241,0.2)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
