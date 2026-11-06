"use client";

// Biểu đồ riêng của các trang ĐLCL / Chi Tiết: đường xu hướng (kèm năm trước) và thác nước MoM.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
import { DT_COLORS } from "@/lib/dashboard/format";
import { Empty, axisTick, BarText } from "../shared/AnalyticsCharts";
import {
  TOOLTIP_STYLE,
  metricAxis,
  metricLabel,
  metricTitle,
} from "../analyticsFormat";
import { pctText } from "./dlclFormat";

/** Đường theo tháng / ngày / thứ; có `previous` thì vẽ thêm đường "Năm Trước". */
export function TrendLineChart({
  points,
  metric,
  currentLabel = "Năm Nay",
  previousLabel = "Năm Trước",
}: {
  points: { label: string; value: number | null; previous?: number | null }[];
  metric: AnalyticsMetric;
  currentLabel?: string;
  previousLabel?: string;
}) {
  if (!points.some((p) => p.value !== null || p.previous)) return <Empty />;
  const hasPrev = points.some((p) => p.previous !== undefined);
  const data = points.map((p) => ({
    name: p.label,
    cur: p.value ?? 0,
    prev: p.previous ?? 0,
  }));
  return (
    <div className="h-[280px]">
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
            formatter={(v, n) => [
              metricLabel(Number(v), metric),
              n === "cur" ? currentLabel : previousLabel,
            ]}
          />
          {hasPrev && (
            <Legend
              formatter={(v) => (v === "cur" ? currentLabel : previousLabel)}
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="cur"
            name="cur"
            stroke={DT_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey="prev"
              name="prev"
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

/**
 * Thác nước "Tình Hình Tăng Trưởng Qua Tháng": mỗi cột là MoM (%) của tháng,
 * cộng dồn như waterfallChart của Power BI, cột cuối là Tổng.
 */
export function MomWaterfall({
  points,
}: {
  points: { label: string; mom: number | null }[];
}) {
  const steps = points.filter((p) => p.mom !== null);
  if (!steps.length) return <Empty />;
  const data: {
    name: string;
    base: number;
    size: number;
    delta: number;
    color: string;
  }[] = [];
  let acc = 0;
  for (const p of steps) {
    const d = (p.mom ?? 0) * 100;
    const start = acc;
    acc += d;
    data.push({
      name: p.label,
      base: Math.min(start, acc),
      size: Math.abs(d),
      delta: d,
      color: d >= 0 ? "#27AE60" : "#EB5757",
    });
  }
  data.push({
    name: "Tổng",
    base: Math.min(0, acc),
    size: Math.abs(acc),
    delta: acc,
    color: DT_COLORS.primaryDeep,
  });
  const pct = (v: number) => pctText(v / 100);
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
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
            width={56}
            tickFormatter={(v) => `${Math.round(Number(v))}%`}
          />
          <ReferenceLine y={0} stroke="#9DBCC2" />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(0,183,204,0.06)" }}
            formatter={(_v, _n, item) => [
              pct((item?.payload as { delta: number }).delta),
              "Tăng Trưởng MoM (%)",
            ]}
          />
          <Bar
            dataKey="base"
            stackId="w"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar dataKey="size" stackId="w" radius={[3, 3, 0, 0]} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            <LabelList
              dataKey="delta"
              content={(p) => (
                <BarText {...p} text={pct(Number(p.value))} side="top" />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Nhãn tiêu đề theo chỉ số đang chọn ("Doanh Số", "Số Lượng Bán"…). */
export const titleOf = (metric: AnalyticsMetric) => metricTitle(metric);
