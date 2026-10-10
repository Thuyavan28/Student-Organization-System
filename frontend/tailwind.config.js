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
        // Public pages use `primary-*`; keep it in the same monochrome family.
        primary: {
          50: '#f4f4f5', 100: '#e4e4e7', 200: '#d4d4d8', 600: '#27272a',
          700: '#18181b', 800: '#09090b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Cards: rounded-2xl (24px), buttons/inputs: rounded-xl (12px)
        '2xl': '1.5rem',
        xl: '0.75rem',
      },
      fontSize: {
        // Slightly larger base scale so body copy reads at 15-16px.
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.625rem' }],
        'page-title': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.025em' }],
        'stat-value': ['1.625rem', { lineHeight: '2rem', fontWeight: '700' }],
        'card-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        caption: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
