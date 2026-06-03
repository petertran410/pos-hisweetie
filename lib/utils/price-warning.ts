import { formatCurrency } from "@/lib/utils";

export interface PriceWarning {
  /** "lower" = đơn giá hiện tại thấp hơn giá gần nhất, "higher" = cao hơn */
  direction: "lower" | "higher";
  /** Đơn giá đang nhập (đã trừ chiết khấu) */
  currentPrice: number;
  /** Đơn giá bán gần nhất của cặp khách hàng + sản phẩm */
  latestPrice: number;
  /** Chênh lệch tuyệt đối giữa currentPrice và latestPrice */
  diff: number;
}

/**
 * So sánh đơn giá hiện tại với giá bán gần nhất của cùng khách hàng + sản phẩm.
 * - Trả null nếu không có giá gần nhất (latestPrice null/undefined) hoặc giá bằng nhau.
 * - Ngược lại trả thông tin chênh lệch để hiển thị cảnh báo.
 */
export function getPriceWarning(
  currentPrice: number,
  latestPrice: number | null | undefined
): PriceWarning | null {
  if (latestPrice === null || latestPrice === undefined) return null;
  if (!Number.isFinite(currentPrice) || !Number.isFinite(latestPrice)) {
    return null;
  }

  const diff = Math.abs(currentPrice - latestPrice);
  if (diff === 0) return null;

  return {
    direction: currentPrice < latestPrice ? "lower" : "higher",
    currentPrice,
    latestPrice,
    diff,
  };
}

/**
 * Text cảnh báo inline hiển thị cạnh trường Đơn giá.
 * Ví dụ: "Giá bán thấp hơn giá bán gần nhất (giá gần nhất: 120,000 VNĐ)".
 */
export function formatPriceWarningText(warning: PriceWarning): string {
  const label = warning.direction === "lower" ? "thấp hơn" : "cao hơn";
  return `Giá bán ${label} giá bán gần nhất (giá gần nhất: ${formatCurrency(
    warning.latestPrice
  )} VNĐ)`;
}
