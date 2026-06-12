/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finance: {
          50: '#111113',
          100: '#18181b',
          200: '#27272a',
          300: '#3f3f46',
          400: '#a1a1aa',
          500: '#d4d4d8',
          600: '#e4e4e7',
          700: '#f4f4f5',
          800: '#fafafa',
          900: '#ffffff',
          950: '#ffffff',
        },
        primary: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
        },
        accent: {
          DEFAULT: '#d6b45d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
