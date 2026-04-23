/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        mistral: {
          orange: "#fa500f",
          red: "#ff4d4d",
          dark: "#0a0a0a",
          surface: "#141414",
          elevated: "#1e1e1e",
        },
      },
    },
  },
  plugins: [],
};

export default config;