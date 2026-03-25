/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        safe: {
          green: "#12FF80",
          dark: "#121312",
          card: "#1C1C1C",
          border: "#303030",
          text: "#A1A3A7",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
