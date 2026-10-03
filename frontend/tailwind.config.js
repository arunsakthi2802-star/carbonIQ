/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: {
          50: '#1e293b',
          100: '#161F30',
          200: '#111827',
          300: '#0F172A',
          card: 'rgba(17, 24, 39, 0.75)',
          hover: 'rgba(30, 41, 59, 0.8)',
        },
        brand: {
          emerald: '#10B981',
          teal: '#14B8A6',
          cyan: '#06B6D4',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        scope: {
          1: '#F59E0B', // Amber for Scope 1 direct
          2: '#3B82F6', // Blue for Scope 2 electricity
          3: '#10B981', // Green for Scope 3 supply chain
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
