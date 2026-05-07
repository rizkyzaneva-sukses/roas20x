/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060d1f',
          900: '#0a1628',
          800: '#0f2040',
          700: '#162d58',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
