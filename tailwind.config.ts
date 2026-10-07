import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      brell: { purple: "#6C2BFF", navy: "#1B1B3A", coral: "#FF5A4E", aqua: "#21D0C3", yellow: "#FFC838", bg: "#F7F8FC" }
    },
    boxShadow: { soft: "0 12px 40px rgba(27,27,58,.08)" },
    borderRadius: { "2xl": "1.25rem" }
  }},
  plugins: []
};
export default config;
