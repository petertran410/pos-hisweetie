// Định dạng số cho Phân tích › Chuyển Kho + Thu Mua.

import { metricLabel } from "../analyticsFormat";

export const BLANK_LABEL = "(Trống)";

/** Số lượng: tối đa 2 chữ số lẻ (tồn kho có số lẻ), BLANK → "". */
export function fmtQty(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

/** Tiền đầy đủ (ô pivot): 1.234.567. */
export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return Math.round(v).toLocaleString("vi-VN");
}

/** Tiền rút gọn "x,xx Tỷ / Triệu" như nhãn Power BI. */
export function fmtMoneyShort(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return metricLabel(v, "amount");
}

/** "2026-10-30" → "30/10/2026". */
export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

/** Nhãn giá trị slicer: token trống của backend → "(Trống)". */
export const optionLabel = (v: string | null, blank?: string) =>
  v === null || v === blank ? BLANK_LABEL : v;
