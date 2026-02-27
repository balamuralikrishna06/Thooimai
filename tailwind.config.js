/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#13ecc8",
        "background-light": "#f6f8f8",
        "background-dark": "#10221f",
        navy: "#0d1b19",
        muted: "#4c9a8d",
      },
      fontFamily: {
        display: ["Public Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1.5rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
