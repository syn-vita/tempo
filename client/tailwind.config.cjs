/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tempo-bg':           'rgb(var(--tempo-bg) / <alpha-value>)',
        'tempo-surface':      'rgb(var(--tempo-surface) / <alpha-value>)',
        'tempo-elevated':     'rgb(var(--tempo-elevated) / <alpha-value>)',
        'tempo-violet':       '#7C3AED',
        'tempo-violet-dark':  '#6D28D9',
        'tempo-emerald':      '#10B981',
        'tempo-amber':        '#F59E0B',
        'tempo-blue':         '#3B82F6',
        'tempo-blue-dark':    '#2563EB',
        'tempo-red':          '#EF4444',
        'tempo-text':         'rgb(var(--tempo-text) / <alpha-value>)',
        'tempo-muted':        'rgb(var(--tempo-muted) / <alpha-value>)',
        'tempo-faint':        'rgb(var(--tempo-faint) / <alpha-value>)',
        'tempo-border':       'rgb(var(--tempo-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'SF Mono'", "'JetBrains Mono'", "'Fira Mono'", "'Consolas'", 'monospace'],
      },
    },
  },
  plugins: [],
};
