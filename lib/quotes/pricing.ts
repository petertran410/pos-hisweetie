/**
 * Tính giá báo giá theo khung — hàm thuần, không gọi API (test jest ở giai đoạn 2).
 */
import type { QuoteItem, QuoteRegion, QuoteTier, QuoteTierDef } from "@/lib/types/quote";
import { QUOTE_REGION_LABEL } from "@/lib/types/quote";

/** Điền giá bảng giá vào các khung chưa sửa tay (không có giá tham chiếu thì giữ giá đang có). */
export function fillFromPriceBook(item: QuoteItem, priceBookPrice: number | null): QuoteItem {
  return {
    ...item,
    priceBookPrice,
    tiers: item.tiers.map((t) => (t.manual ? t : { ...t, price: priceBookPrice ?? t.price })),
  };
}

/** Khung giá (chưa có giá) từ khung mặc định của mẫu. */
export const tiersFrom = (defs: QuoteTierDef[]): QuoteTier[] =>
  defs.map((d) => ({ ...d, price: null, manual: false }));

/** Đổi mẫu: thay bộ khung theo mẫu mới, giữ giá sửa tay của khung trùng khoá. */
export function applyTiers(item: QuoteItem, defs: QuoteTierDef[]): QuoteItem {
  const kept = new Map(item.tiers.filter((t) => t.manual).map((t) => [t.key, t]));
  return fillFromPriceBook(
    { ...item, tiers: tiersFrom(defs).map((t) => {
      const k = kept.get(t.key);
      return k ? { ...t, price: k.price, manual: true } : t;
    }) },
    item.priceBookPrice
  );
}

/** Tiêu đề từ mẫu: {MIEN} → "HÀ NỘI" / "SÀI GÒN", bỏ trống khi Toàn quốc. */
export function renderTitle(pattern: string, region: QuoteRegion) {
  const mien = region === "ALL" ? "" : QUOTE_REGION_LABEL[region].toUpperCase();
  return pattern.replace(/\{MIEN\}/g, mien).replace(/\s+/g, " ").trim();
}

/** % chênh lệch so với giá bảng giá (âm = thấp hơn). null khi không so được. */
export function diffPct(price: number | null, base: number | null): number | null {
  if (price == null || base == null || base <= 0) return null;
  return (price - base) / base;
}

/** Cột khung giá của cả báo giá: hợp các khoá theo thứ tự xuất hiện. */
/** Dòng không áp khung số lượng: in một cột "Giá bán" (giá bán sửa trên form báo giá). */
export function withSalePrice(it: QuoteItem): QuoteItem {
  if (it.tiers.length) return it;
  return {
    ...it,
    tiers: [{ key: "gia_ban", label: "Giá bán", minQty: null, maxQty: null, unit: "", price: it.basePrice, manual: true }],
  };
}

export function tierColumns(items: QuoteItem[]): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const it of items) for (const t of it.tiers) if (!seen.has(t.key)) seen.set(t.key, t.label);
  return [...seen].map(([key, label]) => ({ key, label }));
}

/**
 * Lợi nhuận của đại lý như cột "Lợi Nhuận" trong file Excel:
 * (giá khung đầu − giá thấp nhất) ÷ giá thấp nhất.
 */
export function marginPct(item: QuoteItem): number | null {
  const prices = item.tiers.map((t) => t.price).filter((p): p is number => p != null && p > 0);
  if (prices.length < 2 || item.tiers[0]?.price == null) return null;
  const low = Math.min(...prices);
  return (item.tiers[0].price - low) / low;
}

/** Khung áp dụng cho số lượng `qty` (theo đơn vị của khung). Khung không có cận bị bỏ qua. */
export function tierForQty(tiers: QuoteTier[], qty: number): QuoteTier | null {
  return (
    tiers.find(
      (t) =>
        (t.minQty != null || t.maxQty != null) &&
        (t.minQty == null || qty >= t.minQty) &&
        (t.maxQty == null || qty <= t.maxQty)
    ) ?? null
  );
}

export function tierRangeLabel(t: Pick<QuoteTier, "minQty" | "maxQty" | "unit">): string {
  if (t.minQty == null && t.maxQty == null) return "";
  if (t.maxQty == null) return `≥ ${t.minQty} ${t.unit}`;
  if (t.minQty == null || t.minQty <= 1) return `≤ ${t.maxQty} ${t.unit}`;
  return `${t.minQty}–${t.maxQty} ${t.unit}`;
}

export const formatVnd = (n: number | null | undefined) =>
  n == null ? "" : Math.round(n).toLocaleString("vi-VN");

export const formatPct = (p: number | null) =>
  p == null ? "" : `${p > 0 ? "+" : ""}${(p * 100).toFixed(1).replace(".", ",")}%`;
