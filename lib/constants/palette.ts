/**
 * Bảng màu giao diện (Gốc / A / B / C / Tối). Màu thực tế khai báo ở `app/globals.css`
 * (khối `:root[data-palette=…]`), chọn qua attribute `data-palette` trên `<html>`.
 * `"orig"` (Gốc) là mặc định nên không cần attribute; A/B/C do người dùng tự chọn.
 *
 * File này không phụ thuộc client để `app/layout.tsx` (server) dùng được.
 */
export type Palette = "a" | "b" | "c" | "dark" | "orig";

export const DEFAULT_PALETTE: Palette = "orig";

export const PALETTE_STORAGE_KEY = "ui-palette";

export const PALETTES: {
  value: Palette;
  label: string;
  hint: string;
  /** Màu mẫu [dải menu, nền trang] cho chấm preview. */
  swatch: [string, string];
}[] = [
  {
    value: "orig",
    label: "Gốc",
    hint: "Giao diện cũ (mặc định)",
    swatch: ["#00B7CC", "#FFFFFF"],
  },
  {
    value: "a",
    label: "Teal Diệp Trà",
    hint: "Teal đậm, dễ đọc",
    swatch: ["#00818F", "#EEF3F4"],
  },
  {
    value: "b",
    label: "Xanh dương",
    hint: "Kiểu doanh nghiệp",
    swatch: ["#0B63CE", "#F0F3F8"],
  },
  {
    value: "c",
    label: "Graphite ấm",
    hint: "Giấy kem, giảm ~22% ánh xanh",
    swatch: ["#3A302A", "#FAF2E4"],
  },
  {
    value: "dark",
    label: "Tối",
    hint: "Nền than, dịu khi làm đêm",
    swatch: ["#102428", "#0B1416"],
  },
];

/** Trang công khai cho khách (catalogue, form lead) luôn giữ bảng màu gốc. */
export const FORCED_ORIG_PATH_PREFIXES = ["/cong-thuc", "/f/"];

const PALETTE_VALUES = PALETTES.map((p) => p.value);

export function isPalette(v: unknown): v is Palette {
  return PALETTE_VALUES.includes(v as Palette);
}

/**
 * Script chạy trong `<head>` trước khi vẽ trang để không nháy màu.
 * Đọc JSON của zustand persist (`{ state: { palette } }`) — khớp với
 * `usePaletteStore` + `applyPalette` ở `lib/store/palette.ts`.
 */
export const PALETTE_INIT_SCRIPT = `(function(){try{var t=${JSON.stringify(
  DEFAULT_PALETTE
)};var r=localStorage.getItem(${JSON.stringify(
  PALETTE_STORAGE_KEY
)});if(r){var s=JSON.parse(r);s=s&&s.state&&s.state.palette;if(${JSON.stringify(
  PALETTE_VALUES
)}.indexOf(s)!==-1)t=s}var p=location.pathname;if(${JSON.stringify(
  FORCED_ORIG_PATH_PREFIXES
)}.some(function(x){return p.indexOf(x)===0}))t="orig";if(t!==${JSON.stringify(
  DEFAULT_PALETTE
)})document.documentElement.setAttribute("data-palette",t)}catch(e){}})();`;
