import type { Config } from "tailwindcss";

export default {
  content: ["./options.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chattree: {
          ink: "#17201f",
          muted: "#5f6f6d",
          panel: "#fbfcfa",
          line: "#d6dedb",
          accent: "#0f8f7e",
          branch: "#7c4dff"
        }
      },
      boxShadow: {
        chattree: "0 12px 34px rgba(15, 31, 29, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
