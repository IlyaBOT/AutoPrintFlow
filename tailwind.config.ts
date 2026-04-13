import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 6px)",
        xl: "calc(var(--radius) + 8px)",
        "2xl": "calc(var(--radius) + 16px)",
      },
      boxShadow: {
        panel:
          "0 18px 60px rgba(8, 15, 40, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        soft: "0 12px 30px rgba(29, 44, 86, 0.12)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top left, rgba(117, 181, 255, 0.55), transparent 38%), radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.75), transparent 42%), linear-gradient(140deg, rgba(228, 241, 255, 0.9), rgba(238, 244, 255, 0.65))",
        "sheet-grid":
          "linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 100%), linear-gradient(180deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 100%)",
      },
      animation: {
        float: "float 10s ease-in-out infinite",
        "fade-up": "fadeUp 0.55s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
