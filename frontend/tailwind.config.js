/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Monochrome design tokens — no blue, no indigo.
        cf: {
          bg: '#ffffff',
          fg: '#09090b',
          muted: '#52525b',
          subtle: '#f4f4f5',
          skeleton: '#e4e4e7',
          hover: '#f4f4f5',
          border: '#09090b',
          divider: '#e4e4e7',
          accent: '#dc2626',
          warning: '#ea580c',
          success: '#16a34a',
          pending: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Cards: rounded-2xl (20px), buttons/inputs: rounded-xl (12px)
        '2xl': '1.25rem',
        xl: '0.75rem',
      },
      fontSize: {
        'page-title': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.025em' }],
        'stat-value': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'card-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        caption: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
