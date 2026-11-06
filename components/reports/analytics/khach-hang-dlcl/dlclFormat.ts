import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { PivotMeasure } from "@/lib/api/analytics-khach-hang-dlcl";
import { vi } from "@/lib/dashboard/format";
import { metricTitle } from "../analyticsFormat";

/** Màu "Color for MoM Growth (%)" của Power BI. */
export function momColor(v: number | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (v < 0) return "#EB5757";
  if (v > 0) return "#27AE60";
  return "#C9A227"; // #F2C94C của Power BI, đậm hơn để đọc được trên nền trắng
}

export function pctText(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "";
  return `${(v * 100).toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function numText(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return vi(v);
}

/** Tên cột của từng measure trong bảng pivot. */
export function measureLabel(m: PivotMeasure, metric: AnalyticsMetric): string {
  switch (m) {
    case "value":
      return metricTitle(metric);
    case "mom":
      return "Tăng Trưởng MoM (%)";
    case "amount":
      return "Tổng Tiền Hàng";
    case "orders":
      return "Số Đơn Hàng";
    case "quantity":
      return "Số Lượng Hàng";
    case "general":
      return "Tổng Tiền (giá lẻ)";
    case "diff":
      return "Lợi Nhuận Đại Lý";
    case "margin":
      return "Biên Thương Mại";
  }
}

export function measureText(m: PivotMeasure, v: number | null): string {
  if (m === "mom" || m === "margin") return pctText(v);
  return numText(v);
}

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
export function periodText(p: { from: string; to: string } | null | undefined) {
  return p ? `${fmtDate(p.from)} – ${fmtDate(p.to)}` : "";
}

/** Tải bảng ra file CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export function downloadCsv(
  filename: string,
  rows: (string | number | null | boolean)[][],
) {
  const esc = (v: string | number | null | boolean) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv =
    String.fromCharCode(0xfeff) +
    rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
