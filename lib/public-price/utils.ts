import type { PriceGroupKey } from "./types";

/** Bỏ dấu, chữ thường — để so khớp tên (giống backend public-price.util). */
export const normText = (s: string | null | undefined) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();

/** Gợi ý nhóm khi thêm sản phẩm vào bảng giá. */
export function guessGroup(fullName: string): PriceGroupKey {
  const n = normText(fullName);
  if (/tu dong|dong lanh/.test(n)) return "froz";
  if (/\b(mut|siro|syrup|sot|puree)\b/.test(n)) return "jam";
  if (/\b(tra|olong|o long|matcha|hong tra)\b/.test(n)) return "tea";
  return "top";
}

/** Tên hiển thị quen thuộc cho các thương hiệu chính. */
export function knownBrandLabel(tradeMarkName: string): string {
  const n = normText(tradeMarkName);
  if (n.includes("lermao")) return "LerMao";
  if (n.includes("phuong hoang")) return "Trà Phượng Hoàng";
  if (n.includes("amo")) return "Amo Pastel";
  if (n.includes("natufruit")) return "Natufruite";
  return tradeMarkName;
}

/** Link gắn vào nút trên trang public phải là https:// (backend bỏ link khác khi lưu). */
export function isHttpsUrl(s: string): boolean {
  try {
    return new URL(s.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

export const formatVnd = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("vi-VN"));
