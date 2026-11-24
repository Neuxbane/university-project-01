/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#050507',
          900: '#09090b', // Deep zinc black
          850: '#111114',
          800: '#18181b', // Card surface
          750: '#202024',
          700: '#27272a', // Borders
          600: '#3f3f46',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#d4d4d8',
          100: '#f4f4f5',
          50: '#fafafa',
        },
        // Brand palette from the "Logo baru" — orange-on-ink, kept as an accent
        // so the app stays clean & white-dominant.
        brand: {
          50: '#FFF5EB',
          100: '#FFE9D1',
          200: '#FFD0A3',
          300: '#FFB066',
          400: '#FF8A29',
          500: '#F07000', // primary brand orange (logo)
          600: '#E56201', // hover (logo secondary orange)
          700: '#B84A07',
          800: '#923A0B',
          900: '#5B250C', // deep logo brown
          950: '#361505',
        },
        ink: '#0A0806', // warm near-black from the logo
      },
      boxShadow: {
        'glow-subtle': '0 0 20px -5px rgba(255, 255, 255, 0.04)',
        'card-dark': '0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 4px 16px -2px rgba(0, 0, 0, 0.4)',
      },
      letterSpacing: {
        tightest: '-0.035em',
        tighter: '-0.02em',
      }
    },
  },
  plugins: [],
}
