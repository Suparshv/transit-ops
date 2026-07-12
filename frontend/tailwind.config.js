/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base - dark theme
        'base-bg':      '#0a0a0c',
        'base-panel':   '#111115',
        'base-card':    '#18181d',
        'base-border':  'rgba(255,255,255,0.08)',
        'base-text':    '#e8e8ef',
        'base-muted':   '#6b6b7b',

        // Accent - amber/orange
        'accent':       '#f59e0b',
        'accent-dark':  '#d97706',
        'accent-light': '#fbbf24',

        // Status colors
        'status-green':  '#22c55e',
        'status-blue':   '#3b82f6',
        'status-orange': '#f97316',
        'status-red':    '#ef4444',
        'status-gray':   '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4)',
        'glow-amber': '0 0 12px rgba(245,158,11,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
