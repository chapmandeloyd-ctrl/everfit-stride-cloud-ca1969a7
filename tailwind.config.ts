import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        "daily-ring": {
          fasting: "hsl(var(--ring-fasting))",
          weight: "hsl(var(--ring-weight))",
          activity: "hsl(var(--ring-activity))",
          sleep: "hsl(var(--ring-sleep))",
          water: "hsl(var(--ring-water))",
          journal: "hsl(var(--ring-journal))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "vibes-sway": {
          "0%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(6deg)" },
          "30%": { transform: "rotate(-5deg)" },
          "45%": { transform: "rotate(4deg)" },
          "60%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(2deg)" },
          "90%": { transform: "rotate(-1deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "shimmer-sweep": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(450%)" },
        },
        "icon-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0" },
          "50%": { transform: "scale(1.25)", opacity: "0.45" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "tap-hint-pulse": {
          "0%, 100%": {
            transform: "translateY(0) scale(1)",
            boxShadow: "0 0 0 0 hsl(var(--primary) / 0.45)",
          },
          "50%": {
            transform: "translateY(-2px) scale(1.04)",
            boxShadow: "0 0 0 8px hsl(var(--primary) / 0)",
          },
        },
        "tap-hint-tilt": {
          "0%, 100%": {
            transform: "perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0)",
            boxShadow: "0 4px 12px -2px hsl(var(--primary) / 0.25)",
          },
          "20%": {
            transform: "perspective(600px) rotateX(6deg) rotateY(-8deg) translateY(-2px)",
            boxShadow: "0 8px 18px -4px hsl(var(--primary) / 0.45)",
          },
          "50%": {
            transform: "perspective(600px) rotateX(-4deg) rotateY(8deg) translateY(-3px)",
            boxShadow: "0 10px 22px -6px hsl(var(--primary) / 0.5)",
          },
          "80%": {
            transform: "perspective(600px) rotateX(3deg) rotateY(-4deg) translateY(-1px)",
            boxShadow: "0 6px 14px -4px hsl(var(--primary) / 0.35)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glow: {
          "0%, 100%": { filter: "drop-shadow(0 0 4px rgba(255,255,255,0.4))", transform: "scale(1)" },
          "50%": { filter: "drop-shadow(0 0 14px rgba(255,255,255,0.85))", transform: "scale(1.08)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "vibes-sway": "vibes-sway 1.2s ease-in-out infinite",
        "fade-in": "fade-in 0.35s ease-out",
        "tap-hint-pulse": "tap-hint-pulse 2.4s ease-in-out infinite",
        "tap-hint-tilt": "tap-hint-tilt 3.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
