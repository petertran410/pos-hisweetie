"use client";

// Khối giao diện dùng chung cho các trang Định Kì (thay các khối HTML Content của
// Power BI): khung có nhãn, thẻ số, thanh tỷ lệ, nhãn %, điều hướng tuần / tháng.

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  DK,
  addDaysIso,
  addMonthsIso,
  fmtDate,
  fmtDm,
  fmtMonth,
  fmtPct,
  kpiTone,
  trend,
} from "./dkFormat";

/** Khung có nhãn kiểu "● TÀI CHÍNH - DOANH THU". */
export function DkSection({
  badge,
  color = DK.bar,
  bg = "#E8EEF6",
  right,
  children,
  className = "",
}: {
  badge: string;
  color?: string;
  bg?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dt-panel p-4 space-y-3 min-w-0 ${className}`}>
      <div className="flex items-center gap-2">
        <span
          className="inline-block text-[11.5px] font-bold tracking-wide px-2.5 py-1 rounded-md"
          style={{ background: bg, color }}>
          {badge}
        </span>
        <div className="flex-1" />
        {right}
      </div>
      {children}
    </div>
  );
}

/** Thẻ số nhỏ: nhãn, giá trị, dòng phụ. */
export function DkStat({
  label,
  value,
  sub,
  subColor,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subColor?: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-xl px-3.5 py-3 min-w-0"
      style={{ background: "#F4F7F8" }}>
      <div
        className="text-[12px] font-medium"
        style={{ color: "var(--dt-text-secondary)" }}>
        {label}
      </div>
      <div
        className="text-[22px] font-bold leading-tight dt-mono mt-0.5"
        style={{ color: valueColor }}>
        {value}
      </div>
      {sub !== undefined && (
        <div
          className="text-[11.5px] mt-0.5"
          style={{ color: subColor ?? "var(--dt-text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/** Thanh ngang (width = ratio, tối đa 100%) + nhãn số bên phải. */
export function DkBar({
  ratio,
  color = DK.bar,
  label,
  labelWidth = 92,
}: {
  ratio: number | null;
  color?: string;
  label: ReactNode;
  labelWidth?: number;
}) {
  const w = Math.max(0, Math.min(100, (ratio ?? 0) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: DK.barBg }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${w}%`, background: color }}
        />
      </div>
      <span
        className="dt-mono text-right shrink-0"
        style={{ minWidth: labelWidth }}>
        {label}
      </span>
    </div>
  );
}

/** Nhãn % KPI có màu (xanh / nâu / đỏ). */
export function DkPill({
  value,
  digits = 0,
}: {
  value: number | null;
  digits?: number;
}) {
  const t = kpiTone(value);
  return (
    <span
      className="inline-block text-[11.5px] font-semibold px-2 py-0.5 rounded-full dt-mono"
      style={{ background: t.bg, color: t.fg }}>
      {fmtPct(value, digits)}
    </span>
  );
}

/** ▲ 12,3% / ▼ 4,5% */
export function DkDelta({
  value,
  digits = 1,
}: {
  value: number | null;
  digits?: number;
}) {
  const t = trend(value);
  return (
    <span className="dt-mono whitespace-nowrap" style={{ color: t.color }}>
      {t.arrow} {fmtPct(value, digits)}
    </span>
  );
}

/** Bảng đơn giản kiểu bảng HTML của Power BI. */
export function DkTable({
  head,
  children,
  empty,
}: {
  head: {
    label: ReactNode;
    align?: "left" | "right" | "center";
    width?: string;
  }[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div
      className="border rounded-lg overflow-x-auto"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr style={{ background: "#F3F8F9" }}>
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap ${
                  h.align === "right"
                    ? "text-right"
                    : h.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
                style={{ width: h.width, color: "var(--dt-text-secondary)" }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td
                colSpan={head.length}
                className="p-5 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DkTd({
  children,
  align,
  mono,
  className = "",
  style,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`px-2.5 py-1.5 border-t ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""} ${
        mono ? "dt-mono" : ""
      } ${className}`}
      style={{ borderColor: "var(--dt-border)", ...style }}>
      {children}
    </td>
  );
}

/**
 * Chọn tuần / tháng xem (thay TODAY() của Power BI).
 * value = ngày mốc đang chọn (undefined = hôm nay); resolved = ngày mốc server trả về.
 */
export function DkAnchorNav({
  unit,
  value,
  resolved,
  today,
  onChange,
  label,
  loading,
}: {
  unit: "week" | "month";
  value?: string;
  resolved?: string;
  today?: string;
  onChange: (date: string | undefined) => void;
  label: string;
  loading?: boolean;
}) {
  const shift = (n: number) => {
    if (!resolved) return;
    const next =
      unit === "week"
        ? addDaysIso(resolved, 7 * n)
        : n < 0
          ? addDaysIso(addMonthsIso(resolved, 0), -1) // cuối tháng trước
          : addDaysIso(addMonthsIso(resolved, 2), -1); // cuối tháng sau
    onChange(today && next >= today ? undefined : next);
  };
  const atToday = !value;
  const btn =
    "p-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <button
        type="button"
        className={btn}
        style={{ borderColor: "var(--dt-border)" }}
        onClick={() => shift(-1)}
        disabled={!resolved}
        aria-label={unit === "week" ? "Tuần trước" : "Tháng trước"}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="font-semibold min-w-[150px] text-center">{label}</span>
      <button
        type="button"
        className={btn}
        style={{ borderColor: "var(--dt-border)" }}
        onClick={() => shift(1)}
        disabled={atToday}
        aria-label={unit === "week" ? "Tuần sau" : "Tháng sau"}>
        <ChevronRight className="w-4 h-4" />
      </button>
      {!atToday && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-[12.5px] font-medium px-2 py-1 rounded-md hover:bg-gray-50"
          style={{ color: "var(--dt-primary)" }}>
          Về hiện tại
        </button>
      )}
      {loading && (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
      )}
    </div>
  );
}

export const weekLabel = (from: string, to: string) =>
  `${fmtDm(from)} – ${fmtDate(to)}`;
export const monthLabel = (iso: string) => `Tháng ${fmtMonth(iso)}`;

/** Dòng "Dữ liệu cập nhật vào lúc …" (last_synced_invoice). */
export function DkUpdated({ at }: { at?: string }) {
  if (!at) return null;
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}

/** Trạng thái tải / lỗi chung. */
export function DkLoading({
  error,
  blocks = 3,
}: {
  error?: unknown;
  blocks?: number;
}) {
  if (error)
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  return (
    <div className="space-y-3">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="dt-sk h-[220px] rounded-xl" />
      ))}
    </div>
  );
}
