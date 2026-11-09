"use client";

// Biểu đồ & khung panel dùng chung cho các báo cáo Phân tích (recharts + lớp dt-*).
// Số hiển thị theo chỉ số (metric) bằng metricLabel / metricAxis của analyticsFormat.

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import { CATEGORY_PALETTE } from "@/lib/dashboard/format";
import {
  TOOLTIP_STYLE,
  metricAxis,
  metricLabel,
  metricTitle,
} from "../analyticsFormat";

export const axisTick = { fontSize: 11.5, fill: "#5A8A92" };

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dt-panel flex flex-col min-w-0 ${className}`}>
      <div
        className="flex items-start gap-3 px-5 py-3.5 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-bold leading-snug">{title}</h3>
          {subtitle && (
            <div
              className="text-[12px] mt-0.5"
              style={{ color: "var(--dt-text-muted)" }}>
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}

/** Nhãn số trên thanh: 1 dòng, không xuống hàng (Label mặc định của recharts tự ngắt dòng theo bề rộng thanh). */
export function BarText(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  text: string;
  side: "right" | "top";
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const w = Number(props.width ?? 0);
  const h = Number(props.height ?? 0);
  const common = {
    fill: "#1E3A40",
    fontWeight: 600,
    style: { whiteSpace: "pre" as const },
  };
  return props.side === "right" ? (
    <text x={x + w + 6} y={y + h / 2} dy={4} fontSize={11.5} {...common}>
      {props.text}
    </text>
  ) : (
    <text
      x={x + w / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={10.5}
      {...common}>
      {props.text}
    </text>
  );
}

export function Empty() {
  return (
    <div
      className="h-full min-h-[200px] grid place-items-center text-[13px]"
      style={{ color: "var(--dt-text-muted)" }}>
      Không có dữ liệu
    </div>
  );
}

/** Danh sách thanh ngang (khách VIP, thương hiệu, danh mục): cuộn khi dài. */
export function HBarChart({
  rows,
  metric,
  color,
  maxHeight = 380,
}: {
  rows: { name: string; value: number }[];
  metric: AnalyticsMetric;
  color: string;
  maxHeight?: number;
}) {
  if (!rows.length) return <Empty />;
  const height = Math.max(160, rows.length * 30 + 20);
  return (
    <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 92, left: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={(p: {
                x?: number | string;
                y?: number | string;
                payload?: { value?: string };
              }) => {
                const v = String(p.payload?.value ?? "");
                return (
                  <text
                    x={Number(p.x) - 4}
                    y={Number(p.y)}
                    dy={4}
                    textAnchor="end"
                    fontSize={11.5}
                    fill="#1E3A40">
                    <title>{v}</title>
                    {v.length > 24 ? `${v.slice(0, 23)}…` : v}
                  </text>
                );
              }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              cursor={{ fill: "rgba(0,183,204,0.06)" }}
              formatter={(v) => [
                metricLabel(Number(v), metric),
                metricTitle(metric),
              ]}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[0, 4, 4, 0]}
              barSize={18}>
              <LabelList
                dataKey="value"
                content={(p) => (
                  <BarText
                    {...p}
                    text={metricLabel(Number(p.value), metric)}
                    side="right"
                  />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ColumnChart({
  rows,
  metric,
  color,
}: {
  rows: { name: string; value: number }[];
  metric: AnalyticsMetric;
  color: string;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
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
            tickFormatter={(v) => metricAxis(Number(v), metric)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(0,183,204,0.06)" }}
            formatter={(v) => [
              metricLabel(Number(v), metric),
              metricTitle(metric),
            ]}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}>
            {rows.length <= 12 && (
              <LabelList
                dataKey="value"
                content={(p) => (
                  <BarText
                    {...p}
                    text={metricLabel(Number(p.value), metric)}
                    side="top"
                  />
                )}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  rows,
  metric,
}: {
  rows: { name: string; value: number }[];
  metric: AnalyticsMetric;
}) {
  const data = rows.filter((r) => r.value > 0);
  if (!data.length) return <Empty />;
  const total = data.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={1.5}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, n) => [metricLabel(Number(v), metric), String(n)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 min-w-0 w-full space-y-1.5">
        {data.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{
                background: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
              }}
            />
            <span className="flex-1 min-w-0 truncate">{r.name}</span>
            <span className="dt-mono font-semibold">
              {metricLabel(r.value, metric)}
            </span>
            <span
              className="dt-mono w-12 text-right"
              style={{ color: "var(--dt-text-muted)" }}>
              {((r.value / total) * 100).toLocaleString("vi-VN", {
                maximumFractionDigits: 1,
              })}
              %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
