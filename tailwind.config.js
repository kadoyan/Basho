/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c5ff',
          400: '#8da5ff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4451b8',
          800: '#353d94',
          900: '#2a2f70',
        },
      },
    },
  },
  plugins: [],
}
