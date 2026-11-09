import type { QtMetric, QtMetricValues } from "@/lib/api/analytics-quan-tri";
import { vi } from "@/lib/dashboard/format";

// Định dạng cho báo cáo Quản Trị (view_by có thêm Lợi Nhuận / % Lợi Nhuận).

export const QT_METRIC_OPTIONS: { key: QtMetric; label: string }[] = [
  { key: "amount", label: "Doanh Số" },
  { key: "orders", label: "Hóa Đơn" },
  { key: "quantity", label: "Số Lượng" },
  { key: "customers", label: "Khách Hàng" },
  { key: "profit", label: "Lợi Nhuận" },
  { key: "margin", label: "% Lợi Nhuận" },
];

/** Tên chỉ số trong tiêu đề (tille_*): "Số Lượng Bán" / "Sản Lượng" (xu hướng). */
export function qtMetricTitle(m: QtMetric, trend = false): string {
  switch (m) {
    case "amount":
      return "Doanh Số";
    case "orders":
      return "Hóa Đơn";
    case "customers":
      return "Khách Hàng";
    case "profit":
      return "Lợi Nhuận";
    case "margin":
      return "% Lợi Nhuận";
    default:
      return trend ? "Sản Lượng" : "Số Lượng Bán";
  }
}

export function qtValue(
  row: QtMetricValues | undefined,
  m: QtMetric,
): number | null {
  return row ? row[m] : null;
}

/** "x,xx Tỷ" / "x,xx Triệu" / "x VNĐ" như switch_dynamics_metrics_label. */
export function moneyLabel(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const two = (n: number) =>
    n.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (abs >= 1e9) return `${two(v / 1e9)} Tỷ`;
  if (abs >= 1e6) return `${two(v / 1e6)} Triệu`;
  return `${vi(v)} VNĐ`;
}

/** % 2 chữ số thập phân ("0.00%"). */
export function pct2(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/** Số nguyên "#,##0". */
export function num(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return vi(v);
}

/** Nhãn số theo chỉ số đang xem. */
export function qtLabel(v: number | null, m: QtMetric): string {
  if (m === "amount" || m === "profit") return moneyLabel(v);
  if (m === "margin") return pct2(v);
  return num(v);
}

/** Nhãn trục rút gọn. */
export function qtAxis(v: number, m: QtMetric): string {
  if (m === "margin")
    return `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  const abs = Math.abs(v);
  if (m === "amount" || m === "profit") {
    if (abs >= 1e9)
      return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
    if (abs >= 1e6) return `${Math.round(v / 1e6)}tr`;
    return vi(v);
  }
  if (abs >= 1e6)
    return `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (abs >= 1e3)
    return `${(v / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
  return vi(v);
}

/** Màu tăng trưởng (color_growth_*, Color for MoM Growth / Product Margin). */
export function growthColor(g: number | null | undefined): string | undefined {
  if (g === null || g === undefined || !Number.isFinite(g)) return undefined;
  if (g < 0) return "#EB5757";
  if (g > 0) return "#27AE60";
  return "#F2C94C";
}

/** "▲ 12,34% vs 2025" như subtitle_growth_*_samePeriod. */
export function growthText(
  g: number | null | undefined,
  label: string | null | undefined,
): string {
  if (g === null || g === undefined || !Number.isFinite(g)) return "";
  const mark = g > 0 ? "▲" : g < 0 ? "▼" : "▬";
  return `${mark} ${pct2(g)}${label ? ` vs ${label}` : ""}`;
}

/** DIVIDE(a - b, b) của DAX: null khi b = 0 / trống. */
export function growthOf(
  cur: number | null | undefined,
  prev: number | null | undefined,
): number | null {
  if (!prev) return null;
  return ((cur ?? 0) - prev) / prev;
}

/** "cur:2026-03" → "Tháng 03" (dim_month[Vie Month]). */
export function monthLabel(ym: string): string {
  return `Tháng ${ym.slice(5, 7)}`;
}

export const VIP_COLOR = "#608BC1"; // customer_key_color: khách chiến lược
export const NORMAL_COLOR = "#CBDCEB"; // khách thường

export const BLANK = "(Trống)";
