// Định dạng số cho Phân tích › KPI Sale (theo format string của measure Power BI):
//   tiền "#,0" (đủ số), phần trăm "0.00%", thẻ "x,xx Tỷ" (display units = tỷ).

export const BLANK = "(Trống)";

/** "#,0" — để trống khi không có giá trị (BLANK của Power BI). */
export function num(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return Math.round(v).toLocaleString("vi-VN");
}

/** "0.00%" */
export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "";
  return (
    (v * 100).toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

/** Thẻ (card) Power BI: hiển thị đơn vị tỷ, 2 số lẻ. */
export function ty(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return (
    (v / 1e9).toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " Tỷ"
  );
}

/** Nhãn biểu đồ: "x,xx Tỷ" / "x,xx Triệu". */
export function short(v: number): string {
  const abs = Math.abs(v);
  const two = (n: number) =>
    n.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (abs >= 1e9) return `${two(v / 1e9)} Tỷ`;
  if (abs >= 1e6) return `${two(v / 1e6)} Triệu`;
  return Math.round(v).toLocaleString("vi-VN");
}

/** Màu % hiệu quả (measure "Color for Target … (%)"): < 100% đỏ, = 100% vàng, > 100% xanh. */
export function rateColor(v: number | null | undefined): string | undefined {
  if (v === null || v === undefined || !isFinite(v)) return undefined;
  if (v < 1) return "#EB5757";
  if (v > 1) return "#27AE60";
  return "#C9A227";
}

/** "2026-08" → "2026-08" (dim_month[year_month]); "Tháng 08" cho nhãn ngắn. */
export function monthLabel(ym: string): string {
  return `Tháng ${ym.slice(5, 7)}`;
}

export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${String(i + 1).padStart(2, "0")}`,
}));
