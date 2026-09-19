/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef5ff', 100: '#d9e8ff', 200: '#bcd8ff',
          300: '#8ec0ff', 400: '#599eff', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
        },
        surface: {
          0:   '#05070d',
          50:  '#0a0e1a',
          100: '#111827',
          200: '#1f2937',
          300: '#374151',
          400: '#4b5563',
          500: '#6b7280',
          600: '#9ca3af',
          700: '#d1d5db',
          800: '#e5e7eb',
          900: '#f3f4f6'
        },
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#06b6d4'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}