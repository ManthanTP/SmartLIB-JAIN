/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4f46e5', // Indigo 600
                    hover: '#4338ca',   // Indigo 700
                },
                secondary: '#64748b', // Slate 500
                surface: '#f8fafc',   // Slate 50
                background: 'var(--background)',
                error: '#ef4444',     // Red 500
                text: {
                    primary: 'var(--text-primary)',   // Slate 800 in light, Slate 50 in dark
                    secondary: 'var(--text-secondary)', // Slate 500 in light, Slate 400 in dark
                },
                border: '#e2e8f0',    // Slate 200
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'gradient-shift': 'gradient-shift 3s ease infinite',
                'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                'gradient-shift': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' },
                    '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.8)' },
                }
            }
        },
    },
    plugins: [],
}
