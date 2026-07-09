/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        brand: {
          50: "#eefdf7",
          100: "#d5f8ea",
          500: "#1aa879",
          600: "#128762",
          700: "#0d6f52",
        },
        accent: "#d97706",
      },
      boxShadow: {
        panel: "0 12px 32px rgba(31, 41, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

