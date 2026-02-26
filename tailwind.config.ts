import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EBF0FF",
          100: "#C7D4FF",
          200: "#8FA8FF",
          300: "#577CFF",
          400: "#2E56CC",
          500: "#1B2B6B",
          600: "#0F1D4A",
          700: "#0A1435",
          800: "#060D22",
          900: "#030711",
        },
      },
      fontFamily: {
        cairo: ["Cairo", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
