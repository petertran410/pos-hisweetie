"use client";

// Biểu đồ riêng của các trang Kinh Doanh (bổ sung cho shared/AnalyticsCharts):
// nhiều đường, cột chồng 100%, thác nước (waterfall), đường năm nay / năm trước.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import { CATEGORY_PALETTE, DT_COLORS } from "@/lib/dashboard/format";
import { TOOLTIP_STYLE, metricAxis, metricLabel } from "../analyticsFormat";
import { Empty, axisTick } from "../shared/AnalyticsCharts";
import { pct } from "./kdFormat";

const PALETTE = [
  ...CATEGORY_PALETTE,
  "#E66C37",
  "#12239E",
  "#6B007B",
  "#E044A7",
  "#744EC2",
  "#D9B300",
  "#D64550",
];

/** Đường theo thời gian, mỗi series một đường (Series của lineChart Power BI). */
export function MultiLineChart({
  xKeys,
  points,
  series,
  metric,
  height = 300,
}: {
  xKeys: { key: string; label: string }[];
  points: { x: string; series: string; value: number }[];
  series: string[];
  metric: AnalyticsMetric;
  height?: number;
}) {
  if (!points.length || !series.length) return <Empty />;
  const data = xKeys.map((x) => {
    const row: Record<string, string | number> = { name: x.label };
    for (const s of series) row[s] = 0;
    for (const p of points)
      if (p.x === x.key && series.includes(p.series)) row[p.series] = p.value;
    return row;
  });
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
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
            formatter={(v, n) => [metricLabel(Number(v), metric), String(n)]}
          />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 2.5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Năm nay vs năm trước (switch_dynamics_metrics / _sameYear). */
export function CurPrevLineChart({
  rows,
  metric,
  curLabel = "Năm Nay",
  prevLabel = "Năm Trước",
  height = 280,
}: {
  rows: { label: string; current: number; previous?: number }[];
  metric: AnalyticsMetric;
  curLabel?: string;
  prevLabel?: string;
  height?: number;
}) {
  if (!rows.length) return <Empty />;
  const hasPrev = rows.some((r) => r.previous !== undefined);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows.map((r) => ({
            name: r.label,
            cur: r.current,
            prev: r.previous,
          }))}
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
              n === "cur" ? curLabel : prevLabel,
            ]}
          />
          {hasPrev && (
            <Legend
              formatter={(v) => (v === "cur" ? curLabel : prevLabel)}
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="cur"
            stroke={DT_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey="prev"
              stroke={DT_COLORS.gold}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Cột chồng 100% (hundredPercentStackedColumnChart). */
export function StackedPercentChart({
  xKeys,
  points,
  height = 300,
}: {
  xKeys: { key: string; label: string }[];
  points: { x: string; series: string; value: number }[];
  height?: number;
}) {
  const series = [...new Set(points.map((p) => p.series))];
  if (!series.length) return <Empty />;
  const data = xKeys.map((x) => {
    const pts = points.filter((p) => p.x === x.key);
    const tot = pts.reduce((s, p) => s + p.value, 0) || 1;
    const row: Record<string, string | number> = { name: x.label };
    for (const s of series)
      row[s] = (pts.find((p) => p.series === s)?.value ?? 0) / tot;
    return row;
  });
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
            width={44}
            domain={[0, 1]}
            tickFormatter={(v) => pct(Number(v), 0)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, n) => [pct(Number(v)), String(n)]}
          />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Thác nước tăng trưởng MoM (%) theo tháng (waterfallChart). */
export function WaterfallChart({
  rows,
  height = 280,
}: {
  rows: { label: string; growth: number | null }[];
  height?: number;
}) {
  if (!rows.length) return <Empty />;
  // Điểm bắt đầu của mỗi cột = tổng tăng trưởng các tháng trước (cộng dồn).
  const starts = rows.map((_, i) =>
    rows.slice(0, i).reduce((s, x) => s + (x.growth ?? 0), 0),
  );
  const acc = rows.reduce((s, x) => s + (x.growth ?? 0), 0);
  const data = rows.map((r, i) => {
    const g = r.growth ?? 0;
    return {
      name: r.label,
      base: Math.min(starts[i], starts[i] + g),
      delta: Math.abs(g),
      growth: r.growth,
    };
  });
  data.push({
    name: "Tổng",
    base: Math.min(0, acc),
    delta: Math.abs(acc),
    growth: acc,
  });
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
            width={52}
            tickFormatter={(v) => pct(Number(v), 0)}
          />
          <ReferenceLine y={0} stroke="#9FB8BC" />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(_v, _n, item) => {
              const g = (item?.payload as { growth: number | null })?.growth;
              return [g === null ? "—" : pct(g, 2), "Tăng trưởng MoM"];
            }}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="delta" stackId="w">
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.name === "Tổng"
                    ? DT_COLORS.primaryDeep
                    : (d.growth ?? 0) >= 0
                      ? "#27AE60"
                      : "#EB5757"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Cột theo nhóm (vd % khách mua lại theo nhóm khách), nhãn là chuỗi đã định dạng. */
export function SimpleColumns({
  rows,
  format,
  color = DT_COLORS.primary,
  height = 260,
}: {
  rows: { name: string; value: number }[];
  format: (v: number) => string;
  color?: string;
  height?: number;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
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
            width={48}
            tickFormatter={(v) => format(Number(v))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [format(Number(v)), ""]}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
