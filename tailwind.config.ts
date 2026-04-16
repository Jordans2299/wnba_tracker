import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#f5f7fa",
          100: "#eaeef4",
          200: "#cfd8e5",
          300: "#a6b5cc",
          400: "#758caf",
          500: "#536e96",
          600: "#41587c",
          700: "#364866",
          800: "#2f3d56",
          900: "#1a2235",
          950: "#0d1220",
        },
        accent: {
          DEFAULT: "#9333ea",
          hover: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
