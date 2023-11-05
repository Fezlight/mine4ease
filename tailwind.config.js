import defaultTheme from 'tailwindcss/defaultTheme'

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,vue}'
  ],
  theme: {
    fontFamily: {
      sans: ['Lato', 'Raleway', ...defaultTheme.fontFamily.sans]
    }
  },
  plugins: [
  ]
}
