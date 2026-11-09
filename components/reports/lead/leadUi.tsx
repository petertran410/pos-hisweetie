"use client";

import type { ReactNode } from "react";
import { pct } from "@/lib/dashboard/format";
import { CATEGORY_PALETTE } from "@/lib/dashboard/format";
import {
  LEAD_SOURCE_ORDER,
  type LeadSource,
} from "@/lib/dashboard/lead/leadDashboard.types";

/** Màu cố định cho từng nguồn (theo thứ tự LEAD_SOURCE_ORDER) dùng chung biểu đồ + bảng. */
export const SOURCE_COLOR: Record<LeadSource, string> = Object.fromEntries(
  LEAD_SOURCE_ORDER.map((s, i) => [s, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]]),
) as Record<LeadSource, string>;

/** Khung panel dùng chung cho mọi khối của dashboard Lead. */
export function LeadCard({
  id,
  title,
  subtitle,
  right,
  className = "",
  children,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`dt-panel p-4 min-w-0 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
          {subtitle && (
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--dt-text-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Ô tỷ lệ % kèm thanh nhỏ (max = giá trị lớn nhất của cột để so sánh trực quan). */
export function RateCell({
  value,
  max,
  color = "#00B7CC",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const w = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="dt-mono font-semibold w-[52px] text-right">{pct(value)}</span>
      <span
        className="hidden sm:block w-14 h-[6px] rounded-full overflow-hidden"
        style={{ background: "var(--dt-border)" }}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${w}%`, background: color }}
        />
      </span>
    </div>
  );
}

/** Badge số lượng cảnh báo (0 → trung tính). */
export function CountBadge({ n, warnFrom = 1 }: { n: number; warnFrom?: number }) {
  const hot = n >= warnFrom;
  return (
    <span
      className="dt-mono inline-block min-w-[26px] text-center text-[12px] font-bold px-2 py-[2px] rounded-full"
      style={
        hot
          ? { background: "rgba(192,57,43,0.1)", color: "#C0392B" }
          : { background: "var(--dt-bg-soft)", color: "var(--dt-text-muted)" }
      }>
      {n}
    </span>
  );
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
} as const;
