/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#1e1e1e',
        'panel-bg': '#252526',
        'accent': '#3b82f6',
        'error': '#ef4444',
        'warning': '#eab308',
        'info': '#3b82f6',
        'success': '#22c55e',
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace', 'Consolas'],
      },
    },
  },
  plugins: [],
}
