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
        earth: 'REPLACE_ME', // primary dark — text, dark backgrounds
        clay:  'REPLACE_ME', // accent — CTAs, highlights
        leaf:  'REPLACE_ME', // secondary accent — icons, callouts (omit if not needed)
        paper: 'REPLACE_ME', // page background
        stone: 'REPLACE_ME', // alternate section background
        cream: 'REPLACE_ME', // form / card background
      },
      fontFamily: {
        serif: ['REPLACE_ME', 'serif'], // heading typeface
        sans:  ['REPLACE_ME', 'sans-serif'], // body typeface
      },
      screens: {
        pointer: { raw: '(hover: hover)' },
      },
    },
  },
  plugins: [],
}
