import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import twColors from "tailwindcss/colors";

// ---------- Màu badge / chữ màu theo bảng màu ----------
// bg-{màu}-50/100/200, text-{màu}-600..900, border-{màu}-100..300 đọc biến --c-*.
// Bảng sáng (Gốc/A/B/C): biến = đúng màu Tailwind (không đổi gì).
// Bảng Tối: nền nhạt = màu-500 trộn với nền thẻ tối; chữ/viền dùng bậc sáng/tối tương ứng
// (đã kiểm tra chữ trên nền badge ≥ 5:1 cho cả 17 họ màu).
const HUES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;
type Hue = (typeof HUES)[number];
const DARK_SURFACE = "#152023"; // = --surface của bảng Tối (app/globals.css)

const BG_STEPS = [50, 100, 200] as const;
const TEXT_STEPS = [600, 700, 800, 900] as const;
const BORDER_STEPS = [100, 200, 300] as const;

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channels = (hex: string) => rgb(hex).join(" ");
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return A.map((v, i) => Math.round(v * t + B[i] * (1 - t))).join(" ");
};
const tone = (hue: Hue, step: number): string =>
  (twColors[hue] as Record<number, string>)[step];

const DARK_BG: Record<number, (h: Hue) => string> = {
  50: (h) => mix(tone(h, 500), DARK_SURFACE, 0.1),
  100: (h) => mix(tone(h, 500), DARK_SURFACE, 0.16),
  200: (h) => mix(tone(h, 500), DARK_SURFACE, 0.24),
};
const DARK_TEXT: Record<number, number> = {
  600: 400,
  700: 300,
  800: 200,
  900: 100,
};
const DARK_BORDER: Record<number, number> = { 100: 900, 200: 800, 300: 700 };

const colorScale = (kind: "bg" | "tx" | "bd", steps: readonly number[]) =>
  Object.fromEntries(
    HUES.map((h) => [
      h,
      Object.fromEntries(
        steps.map((s) => [s, `rgb(var(--c-${kind}-${h}-${s}) / <alpha-value>)`])
      ),
    ])
  );

const colorVars = (dark: boolean) => {
  const vars: Record<string, string> = {};
  for (const h of HUES) {
    for (const s of BG_STEPS)
      vars[`--c-bg-${h}-${s}`] = dark ? DARK_BG[s](h) : channels(tone(h, s));
    for (const s of TEXT_STEPS)
      vars[`--c-tx-${h}-${s}`] = channels(tone(h, dark ? DARK_TEXT[s] : s));
    for (const s of BORDER_STEPS)
      vars[`--c-bd-${h}-${s}`] = channels(tone(h, dark ? DARK_BORDER[s] : s));
  }
  return vars;
};

const config: Config = {
  // dark: chỉ dùng cho vài chỗ màu viết cứng lẻ; áp khi bảng màu Tối, trừ vùng giữ sáng .palette-orig.
  darkMode: [
    "variant",
    '&:is([data-palette="dark"] *):not(.palette-orig, .palette-orig *)',
  ],
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
          header: "var(--dt-color-header)",
          "header-fg": "var(--dt-color-header-fg)",
          "header-hover": "var(--dt-color-header-hover)",
          "header-pill": "var(--dt-color-header-pill)",
        },
        // Thang xám theo bảng màu đang chọn (biến --g-* ở app/globals.css):
        // A ngả teal, B slate, C ngả ấm, Tối đảo ngược, Gốc = gray mặc định của Tailwind.
        gray: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [
            s,
            `rgb(var(--g-${s}) / <alpha-value>)`,
          ])
        ),
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
      textColor: {
        // Chữ xám nhạt đậm hơn nền/viền cùng bậc để đạt 4.5:1 (trừ bảng "Gốc").
        gray: {
          400: "rgb(var(--gt-400) / <alpha-value>)",
          500: "rgb(var(--gt-500) / <alpha-value>)",
        },
        // Chữ brand tách khỏi nền nút: bảng Tối dùng teal sáng để đọc được trên nền tối.
        brand: {
          DEFAULT: "var(--dt-text-brand)",
          bright: "var(--dt-text-brand-bright)",
          mid: "var(--dt-text-brand-mid)",
          deep: "var(--dt-text-brand-deep)",
          dark: "var(--dt-text-brand-dark)",
        },
        black: "rgb(var(--dt-text-black) / <alpha-value>)",
        ...colorScale("tx", TEXT_STEPS),
      },
      backgroundColor: {
        // bg-white = màu thẻ của bảng màu (C ngả kem, Tối là than); text-white vẫn trắng.
        white: "rgb(var(--surface) / <alpha-value>)",
        // Tooltip/khối tối (bg-gray-600..950): bảng Tối giữ tối, không đảo thành sáng.
        gray: Object.fromEntries(
          [600, 700, 800, 900, 950].map((s) => [
            s,
            `rgb(var(--gb-${s}) / <alpha-value>)`,
          ])
        ),
        ...colorScale("bg", BG_STEPS),
      },
      borderColor: colorScale("bd", BORDER_STEPS),
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
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root, .palette-orig": colorVars(false),
        ':root[data-palette="dark"]': colorVars(true),
      });
    }),
  ],
};

export default config;
