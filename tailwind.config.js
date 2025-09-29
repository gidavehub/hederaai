/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse-slow 15s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': {
            opacity: 0.4,
            transform: 'scale(1)',
          },
          '50%': {
            opacity: 0.6,
            transform: 'scale(1.05)',
          },
        },
      },
    },
  },
  plugins: [],
}