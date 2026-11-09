"use client";

// Biểu đồ của báo cáo Quản Trị: như shared/AnalyticsCharts nhưng nhận hàm định
// dạng số (để hiện được Lợi Nhuận "x,xx Tỷ" và % Lợi Nhuận "x,xx%").

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CATEGORY_PALETTE, DT_COLORS } from "@/lib/dashboard/format";
import { TOOLTIP_STYLE } from "../analyticsFormat";
import { BarText, Empty, axisTick } from "../shared/AnalyticsCharts";

export type Fmt = (v: number) => string;

export interface BarRow {
  name: string;
  value: number;
  color?: string;
}

const PALETTE = [
  ...CATEGORY_PALETTE,
  "#608BC1",
  "#E07A5F",
  "#81B29A",
  "#B5838D",
  "#6D597A",
  "#F2CC8F",
];
export const paletteAt = (i: number) => PALETTE[i % PALETTE.length];

/** Thanh ngang (cuộn khi dài). Màu từng thanh theo row.color nếu có. */
export function QtHBar({
  rows,
  fmt,
  color = DT_COLORS.primary,
  maxHeight = 420,
  labelWidth = 170,
  valueName = "Giá trị",
}: {
  rows: BarRow[];
  fmt: Fmt;
  color?: string;
  maxHeight?: number;
  labelWidth?: number;
  valueName?: string;
}) {
  if (!rows.length) return <Empty />;
  const height = Math.max(160, rows.length * 28 + 20);
  return (
    <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 96, left: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={labelWidth}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={(p: {
                x?: number | string;
                y?: number | string;
                payload?: { value?: string };
              }) => {
                const v = String(p.payload?.value ?? "");
                const max = Math.floor(labelWidth / 7);
                return (
                  <text
                    x={Number(p.x) - 4}
                    y={Number(p.y)}
                    dy={4}
                    textAnchor="end"
                    fontSize={11.5}
                    fill="#1E3A40">
                    <title>{v}</title>
                    {v.length > max ? `${v.slice(0, max - 1)}…` : v}
                  </text>
                );
              }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              cursor={{ fill: "rgba(0,183,204,0.06)" }}
              formatter={(v) => [fmt(Number(v)), valueName]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={17}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.color ?? color} />
              ))}
              <LabelList
                dataKey="value"
                content={(p) => (
                  <BarText {...p} text={fmt(Number(p.value))} side="right" />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Cột đứng. */
export function QtColumn({
  rows,
  fmt,
  axisFmt,
  color = DT_COLORS.primary,
  height = 280,
  valueName = "Giá trị",
}: {
  rows: BarRow[];
  fmt: Fmt;
  axisFmt: Fmt;
  color?: string;
  height?: number;
  valueName?: string;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div style={{ height }}>
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
            tickFormatter={(v) => axisFmt(Number(v))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(0,183,204,0.06)" }}
            formatter={(v) => [fmt(Number(v)), valueName]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color ?? color} />
            ))}
            {rows.length <= 12 && (
              <LabelList
                dataKey="value"
                content={(p) => (
                  <BarText {...p} text={fmt(Number(p.value))} side="top" />
                )}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bánh / vòng: tỷ trọng theo giá trị dương (Power BI không vẽ lát âm). */
export function QtDonut({ rows, fmt }: { rows: BarRow[]; fmt: Fmt }) {
  const data = rows.filter((r) => r.value > 0);
  if (!data.length) return <Empty />;
  const total = data.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={86}
              paddingAngle={1.5}>
              {data.map((r, i) => (
                <Cell key={i} fill={r.color ?? paletteAt(i)} />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, n) => [fmt(Number(v)), String(n)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 min-w-0 w-full space-y-1.5">
        {data.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: r.color ?? paletteAt(i) }}
            />
            <span className="flex-1 min-w-0 truncate" title={r.name}>
              {r.name}
            </span>
            <span className="dt-mono font-semibold">{fmt(r.value)}</span>
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

/** Đường xu hướng; prev (năm trước) tuỳ chọn. */
export function QtLine({
  rows,
  fmt,
  axisFmt,
  curName,
  prevName,
  height = 280,
}: {
  rows: { name: string; cur: number | null; prev?: number | null }[];
  fmt: Fmt;
  axisFmt: Fmt;
  curName: string;
  prevName?: string;
  height?: number;
}) {
  if (!rows.length) return <Empty />;
  const hasPrev = prevName !== undefined;
  return (
    <div style={{ height }}>
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
            tickFormatter={(v) => axisFmt(Number(v))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, n) => [
              fmt(Number(v)),
              n === "cur" ? curName : (prevName ?? ""),
            ]}
          />
          {hasPrev && (
            <Legend
              formatter={(v) => (v === "cur" ? curName : prevName)}
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="cur"
            stroke={DT_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey="prev"
              stroke={DT_COLORS.gold}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Cột / thanh chồng 100% (hundredPercentStacked…): mỗi nhóm là 1 cột,
 * series = các phần; giá trị hiển thị là % trong nhóm.
 */
export function QtStacked100({
  groups,
  series,
  value,
  fmt,
  horizontal = false,
  height = 280,
  colors,
}: {
  groups: string[];
  series: string[];
  value: (group: string, s: string) => number;
  fmt: Fmt;
  horizontal?: boolean;
  height?: number;
  colors?: Record<string, string>;
}) {
  if (!groups.length || !series.length) return <Empty />;
  const data = groups.map((g) => {
    const total = series.reduce((s, x) => s + Math.max(0, value(g, x)), 0);
    const row: Record<string, string | number> = { name: g };
    for (const s of series) {
      const v = Math.max(0, value(g, s));
      row[s] = total ? v / total : 0;
      row[`__raw_${s}`] = v;
    }
    return row;
  });
  const h = horizontal ? Math.max(height, groups.length * 26 + 60) : height;
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: horizontal ? 4 : 0, bottom: 0 }}
          stackOffset="expand">
          {horizontal ? (
            <>
              <XAxis type="number" hide domain={[0, 1]} />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ ...axisTick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={(v: string) =>
                  v.length > 26 ? `${v.slice(0, 25)}…` : v
                }
              />
            </>
          ) : (
            <>
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
                width={40}
                tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
              />
            </>
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, n, item) => {
              const raw = (item?.payload as Record<string, number>)?.[
                `__raw_${String(n)}`
              ];
              return [
                `${fmt(raw ?? 0)} (${(Number(v) * 100).toLocaleString("vi-VN", {
                  maximumFractionDigits: 1,
                })}%)`,
                String(n),
              ];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={colors?.[s] ?? paletteAt(i)}
              maxBarSize={horizontal ? 18 : 44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Phân tán (scatter) theo nhóm. */
export function QtScatter({
  points,
  xFmt,
  yFmt,
  xName,
  yName,
  height = 380,
}: {
  points: { name: string; group: string; x: number; y: number }[];
  xFmt: Fmt;
  yFmt: Fmt;
  xName: string;
  yName: string;
  height?: number;
}) {
  if (!points.length) return <Empty />;
  const groups = [...new Set(points.map((p) => p.group))];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3EEF0" />
          <XAxis
            type="number"
            dataKey="x"
            name={xName}
            tick={axisTick}
            tickFormatter={(v) => xFmt(Number(v))}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yName}
            tick={axisTick}
            width={60}
            tickFormatter={(v) => yFmt(Number(v))}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as
                { name: string; x: number; y: number } | undefined;
              if (!active || !p) return null;
              return (
                <div
                  className="rounded-md px-2.5 py-1.5 text-[12px]"
                  style={{ background: "#0D3B42", color: "#fff" }}>
                  <div className="font-semibold mb-0.5">{p.name}</div>
                  <div>
                    {xName}: {xFmt(p.x)}
                  </div>
                  <div>
                    {yName}: {yFmt(p.y)}
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {groups.map((g, i) => (
            <Scatter
              key={g}
              name={g}
              data={points.filter((p) => p.group === g)}
              fill={paletteAt(i)}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
