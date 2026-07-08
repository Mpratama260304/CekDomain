import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "oklch(98.6% 0.008 300 / <alpha-value>)",
          soft: "oklch(97% 0.011 300 / <alpha-value>)",
        },
        surface: "oklch(100% 0 0 / <alpha-value>)",
        ink: {
          900: "oklch(23% 0.035 300 / <alpha-value>)",
          700: "oklch(38% 0.045 300 / <alpha-value>)",
          500: "oklch(52% 0.03 300 / <alpha-value>)",
          400: "oklch(64% 0.022 300 / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(48% 0.17 295 / <alpha-value>)",
          600: "oklch(43% 0.18 295 / <alpha-value>)",
          700: "oklch(37% 0.16 295 / <alpha-value>)",
          soft: "oklch(94% 0.03 295 / <alpha-value>)",
          tint: "oklch(96.5% 0.018 295 / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(58% 0.14 158 / <alpha-value>)",
          soft: "oklch(95% 0.045 158 / <alpha-value>)",
          ink: "oklch(38% 0.09 158 / <alpha-value>)",
        },
        warn: {
          DEFAULT: "oklch(64% 0.16 45 / <alpha-value>)",
          soft: "oklch(95.5% 0.04 55 / <alpha-value>)",
          ink: "oklch(45% 0.13 42 / <alpha-value>)",
        },
        danger: {
          DEFAULT: "oklch(58% 0.17 22 / <alpha-value>)",
          soft: "oklch(96% 0.03 22 / <alpha-value>)",
          ink: "oklch(42% 0.14 22 / <alpha-value>)",
        },
        line: {
          DEFAULT: "oklch(91% 0.012 300 / <alpha-value>)",
          strong: "oklch(85% 0.016 300 / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Manrope",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      boxShadow: {
        sm: "0 1px 2px oklch(30% 0.03 300 / 0.06), 0 1px 3px oklch(30% 0.03 300 / 0.05)",
        md: "0 8px 24px oklch(30% 0.04 300 / 0.08), 0 2px 6px oklch(30% 0.04 300 / 0.05)",
        lg: "0 24px 60px oklch(30% 0.06 300 / 0.14), 0 8px 20px oklch(30% 0.05 300 / 0.08)",
        glow: "0 20px 50px oklch(48% 0.17 295 / 0.22)",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22,1,0.36,1)",
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.16,1,0.3,1) both",
        pulse: "pulse 2s infinite",
        spin: "spin 0.7s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
