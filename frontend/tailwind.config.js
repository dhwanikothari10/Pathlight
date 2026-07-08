/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: '#1E1B4B',        // deep indigo — header, headings
        paper: '#FAF9F6',      // warm off-white background
        accent: '#D97757',     // amber/terracotta — CTAs, AI highlights
        slate: '#475569',      // body text
        success: '#16A34A',    // progress, completion
        line: '#E7E3DA',       // hairline borders
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
