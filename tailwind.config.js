/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: '#ff2d6f',
        'pink-dim': '#ff6b9d',
        'pink-light': '#ffa9c4',
        'pink-deep': '#d81b57',
        ink: '#0a0a0a',
        surface: '#141414',
        'surface-2': '#1a1a1a',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
