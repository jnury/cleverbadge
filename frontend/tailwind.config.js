/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-teal': '#1D4E5A', // Deep Teal
        'accent-copper': '#B55C34', // Copper
        'copper-dark': '#853F21', // Dark Copper
        'copper-light': '#D98C63', // Light Copper
        'tech-blue': '#4DA6C0', // Tech Blue
        'circuit-blue': '#2A6373', // Circuit Blue
      }
    },
  },
  plugins: [],
}
