/** @type {import('tailwindcss').Config} */
module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    './_includes/**/*.html',
    './_layouts/**/*.html',
    './*.html',
  ],
  theme: {
    extend: {
      colors: {
        earth: '#2D4A28', // primary dark — text, dark backgrounds
        clay:  '#B05A2C', // accent — CTAs, highlights
        leaf:  '#4F6E40', // secondary accent — icons, callouts
        paper: '#F4EFE6', // page background
        stone: '#EBE3D3', // alternate section background
        cream: '#F9F6F1', // form / card background
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'], // heading typeface
        sans:  ['"DM Sans"', 'sans-serif'],        // body typeface
      },
      screens: {
        pointer: { raw: '(hover: hover)' },
      },
    },
  },
  plugins: [],
}
