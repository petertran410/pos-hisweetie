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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Diệp Trà brand — trỏ var(--dt-…) khai báo ở globals.css
        brand: {
          DEFAULT: "var(--dt-color-primary)",
          bright: "var(--dt-color-primary-bright)",
          mid: "var(--dt-color-primary-mid)",
          deep: "var(--dt-color-primary-deep)",
          dark: "var(--dt-color-primary-dark)",
          soft: "var(--dt-color-primary-soft)",
          overlay: "var(--dt-color-overlay-dark)",
        },
        cyan: {
          soft: "var(--dt-color-cyan-soft)",
          pale: "var(--dt-color-cyan-pale)",
          bg: "var(--dt-color-cyan-bg)",
        },
        gold: {
          DEFAULT: "var(--dt-color-gold)",
          light: "var(--dt-color-gold-light)",
          soft: "var(--dt-color-gold-soft)",
        },
        "brand-border": {
          DEFAULT: "var(--dt-color-border)",
          strong: "var(--dt-color-border-strong)",
        },
        price: "var(--dt-color-price)",
        sale: "var(--dt-color-sale)",
        instock: "var(--dt-color-instock)",
        outofstock: "var(--dt-color-outofstock)",
        rating: "var(--dt-color-rating)",
      },
      fontSize: {
        md: ["1rem", { lineHeight: "1.5rem" }],
      },
      borderRadius: {
        control: "var(--dt-radius-control)",
        card: "var(--dt-radius-card)",
      },
      boxShadow: {
        nav: "var(--dt-shadow-nav)",
        card: "var(--dt-shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
