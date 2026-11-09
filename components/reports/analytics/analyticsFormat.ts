import type {
  AnalyticsMetric,
  MetricValues,
} from "@/lib/api/analytics-reports";
import { vi } from "@/lib/dashboard/format";

// Nhãn chỉ số như Power BI (view_by[vie_mode] và các tiêu đề tille_*).
export const METRIC_OPTIONS: { key: AnalyticsMetric; label: string }[] = [
  { key: "amount", label: "Doanh Số" },
  { key: "orders", label: "Hóa Đơn" },
  { key: "quantity", label: "Số Lượng" },
  { key: "customers", label: "Khách Hàng" },
];

/** Tên chỉ số dùng trong tiêu đề biểu đồ. */
export function metricTitle(m: AnalyticsMetric, trend = false): string {
  if (m === "amount") return "Doanh Số";
  if (m === "orders") return "Hóa Đơn";
  if (m === "customers") return "Khách Hàng";
  return trend ? "Sản Lượng" : "Số Lượng Bán";
}

export function metricValue(
  row: MetricValues | undefined,
  m: AnalyticsMetric,
): number {
  return row ? row[m] : 0;
}

/** Nhãn số trên biểu đồ (switch_dynamics_metrics_label): "x,xx Tỷ" / "x,xx Triệu" / "x VNĐ". */
export function metricLabel(v: number, m: AnalyticsMetric): string {
  if (m !== "amount") return vi(v);
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

/** Trục: rút gọn. */
export function metricAxis(v: number, m: AnalyticsMetric): string {
  if (m !== "amount") {
    if (Math.abs(v) >= 1e6)
      return `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
    if (Math.abs(v) >= 1e3)
      return `${(v / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
    return vi(v);
  }
  if (Math.abs(v) >= 1e9)
    return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(v) >= 1e6) return `${Math.round(v / 1e6)}tr`;
  return vi(v);
}

/** % tăng trưởng so với kỳ trước (growth_*_samePeriod). null = kỳ trước không có số. */
export function growthDelta(growth: number | null) {
  if (growth === null) return { delta: "—", dir: "flat" as const };
  const p = (growth * 100).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (growth > 0) return { delta: `+${p}%`, dir: "up" as const };
  if (growth < 0) return { delta: `${p}%`, dir: "down" as const };
  return { delta: "0,00%", dir: "flat" as const };
}

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0D3B42",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
  },
  labelStyle: { color: "#A8D8E0" },
  itemStyle: { color: "#fff" },
};

export const BLANK_LABEL = "(Trống)";
