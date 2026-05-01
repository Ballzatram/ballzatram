import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        board: "#0f1a16",
        chalk: "#e8efe8",
        accent: "#8de2b5",
      },
      fontFamily: {
        chalk: ["'Inter'", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
