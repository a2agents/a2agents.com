/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        // Warm, earthy palette - not cold tech blue
        primary: {
          50: '#faf5f1',
          100: '#f4e8dd',
          200: '#e8ccb8',
          300: '#d9a88c',
          400: '#ca8562',
          500: '#b86b44',
          600: '#a35539',
          700: '#874131',
          800: '#70372d',
          900: '#5c2f27',
          950: '#321614',
        },
        secondary: {
          50: '#f7f6f4',
          100: '#edebe5',
          200: '#dbd4c9',
          300: '#c5b5a6',
          400: '#b09686',
          500: '#9f7f6b',
          600: '#926e5f',
          700: '#7a5a4f',
          800: '#644b43',
          900: '#524038',
          950: '#2b211d',
        },
        warm: {
          50: '#fdfcfb',
          100: '#f9f5f3',
          200: '#f4ebe4',
          300: '#ead6c7',
          400: '#deb9a0',
          500: '#ce9b7d',
          600: '#b87f60',
          700: '#9a6749',
          800: '#7e553e',
          900: '#684636',
          950: '#382419',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        serif: [
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'Times',
          'serif',
        ],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '96': '24rem',
        '104': '26rem',
        '112': '28rem',
        '120': '30rem',
        '128': '32rem',
        '136': '34rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#374151',
            a: {
              color: '#b86b44',
              '&:hover': {
                color: '#a35539',
              },
            },
          },
        },
      },
    },
  },
  plugins: [],
}