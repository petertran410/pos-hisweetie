"use client";

// Biểu đồ / khung dùng riêng cho báo cáo Khách Hàng (bổ sung cho shared/AnalyticsCharts).

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";
import { CATEGORY_PALETTE, DT_COLORS } from "@/lib/dashboard/format";
import {
  BLANK_LABEL,
  TOOLTIP_STYLE,
  metricAxis,
  metricLabel,
} from "../analyticsFormat";
import { Empty, axisTick } from "../shared/AnalyticsCharts";

export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

export const AXIS_OPTIONS: { key: AnalyticsAxis; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "weekday", label: "Thứ" },
  { key: "month", label: "Tháng" },
];

/** Nhãn kỳ đang xem / kỳ so sánh ở góc phải thanh tab. */
export function KhPeriodNote({
  fetching,
  period,
  compare,
}: {
  fetching: boolean;
  period?: { from: string; to: string } | null;
  compare?: { from: string; to: string } | null;
}) {
  return (
    <div
      className="text-[12px] flex items-center gap-2"
      style={{ color: "var(--dt-text-muted)" }}>
      {fetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {period && (
        <span>
          Kỳ: {fmtDate(period.from)} – {fmtDate(period.to)}
          {compare && (
            <>
              {" "}
              · So với: {fmtDate(compare.from)} – {fmtDate(compare.to)}
            </>
          )}
        </span>
      )}
    </div>
  );
}

/** Trạng thái chung: lỗi / đang tải / không có kỳ. Trả null khi đã có dữ liệu. */
export function KhStatus({
  error,
  loading,
  noPeriod,
  year,
  skeleton = 3,
  children,
}: {
  error: unknown;
  loading: boolean;
  noPeriod?: boolean;
  year?: number;
  skeleton?: number;
  children?: ReactNode;
}) {
  if (error)
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: skeleton }, (_, i) => (
          <div key={i} className="dt-sk h-[260px] rounded-xl" />
        ))}
      </div>
    );
  if (noPeriod)
    return (
      <div
        className="dt-panel p-8 text-center text-[13px]"
        style={{ color: "var(--dt-text-muted)" }}>
        Kỳ đã chọn chưa có ngày nào{year ? ` (năm ${year} chưa bắt đầu)` : ""}.
      </div>
    );
  return <>{children}</>;
}

export function UpdatedAt({ at }: { at: string }) {
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}

/** Đường "Năm Nay" vs "Năm Trước" (switch_dynamics_metrics / _sameYear). */
export function TrendLineChart({
  rows,
  metric,
  year,
}: {
  rows: { name: string; cur: number; prev: number }[];
  metric: AnalyticsMetric;
  year: number;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => metricAxis(Number(v), metric)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, n) => [
              metricLabel(Number(v), metric),
              n === "cur" ? `Năm Nay (${year})` : `Năm Trước (${year - 1})`,
            ]}
          />
          <Legend
            formatter={(v) =>
              v === "cur" ? `Năm Nay (${year})` : `Năm Trước (${year - 1})`
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="cur"
            stroke={DT_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="prev"
            stroke={DT_COLORS.gold}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Cột chồng 100% (hundredPercentStackedColumnChart): mỗi cột là 1 nhóm trục,
 * mỗi phần là 1 series; tooltip hiện giá trị và tỷ trọng.
 */
export function StackedPercentChart({
  rows,
  metric,
  height = 300,
}: {
  rows: { group: string; series: string | null; value: number }[];
  metric: AnalyticsMetric;
  height?: number;
}) {
  const groups: string[] = [];
  const seriesTotal = new Map<string, number>();
  const data = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    if (!r.value) continue;
    const s = r.series ?? BLANK_LABEL;
    if (!data.has(r.group)) {
      groups.push(r.group);
      data.set(r.group, { name: r.group });
    }
    const d = data.get(r.group)!;
    d[s] = (Number(d[s]) || 0) + r.value;
    seriesTotal.set(s, (seriesTotal.get(s) ?? 0) + r.value);
  }
  const series = [...seriesTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  if (!groups.length) return <Empty />;
  const list = groups.map((g) => data.get(g)!);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={list}
          stackOffset="expand"
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(0,183,204,0.06)" }}
            formatter={(v, n, item) => {
              const row = (item?.payload ?? {}) as Record<string, unknown>;
              const total = series.reduce(
                (s, k) => s + (Number(row[k]) || 0),
                0,
              );
              const share = total ? (Number(v) / total) * 100 : 0;
              return [
                `${metricLabel(Number(v), metric)} (${share.toLocaleString(
                  "vi-VN",
                  { maximumFractionDigits: 1 },
                )}%)`,
                String(n),
              ];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
              maxBarSize={56}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Thanh ngang có giá trị âm / dương (vd % WoW): nhãn % ở đầu thanh. */
export function PercentBarList({
  rows,
  color,
  emptyText = "Không có dữ liệu",
}: {
  rows: { name: string; value: number }[];
  color: string;
  emptyText?: string;
}) {
  if (!rows.length)
    return (
      <div
        className="h-full min-h-[200px] grid place-items-center text-[13px]"
        style={{ color: "var(--dt-text-muted)" }}>
        {emptyText}
      </div>
    );
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0.0001);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-2 text-[12.5px]">
          <span className="w-[42%] min-w-0 truncate" title={r.name}>
            {r.name}
          </span>
          <span className="flex-1 h-[16px] rounded bg-[#F3F8F9] overflow-hidden">
            <span
              className="block h-full rounded"
              style={{
                width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%`,
                background: color,
              }}
            />
          </span>
          <span className="dt-mono w-[78px] text-right font-semibold">
            {(r.value * 100).toLocaleString("vi-VN", {
              maximumFractionDigits: 2,
            })}
            %
          </span>
        </li>
      ))}
    </ul>
  );
}
