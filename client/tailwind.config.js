/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tempo-bg':           '#08080F',
        'tempo-surface':      '#0F0F1C',
        'tempo-elevated':     '#161627',
        'tempo-violet':       '#7C3AED',
        'tempo-violet-dark':  '#6D28D9',
        'tempo-emerald':      '#10B981',
        'tempo-amber':        '#F59E0B',
        'tempo-blue':         '#3B82F6',
        'tempo-blue-dark':    '#2563EB',
        'tempo-red':          '#EF4444',
        'tempo-text':         '#F1F5F9',
        'tempo-muted':        '#64748B',
        'tempo-faint':        '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'SF Mono'", "'JetBrains Mono'", "'Fira Mono'", "'Consolas'", 'monospace'],
      },
    },
  },
  plugins: [],
};
