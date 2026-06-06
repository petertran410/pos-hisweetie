"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "@/lib/api/dashboard";
import { money, moneyAxis, DT_COLORS } from "@/lib/dashboard/format";

/** Sparkline trắng trong hero card. */
export function MobileSparkline({ data }: { data: TrendPoint[] }) {
  if (!data.length) return <div className="h-[38px]" />;
  return (
    <div className="h-[38px] mt-[14px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dtMSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#fff"
            strokeWidth={2}
            fill="url(#dtMSpark)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Line chart DT/LN nhỏ gọn cho card mobile. */
export function MobileTrendChart({
  data,
  showProfit,
}: {
  data: TrendPoint[];
  showProfit: boolean;
}) {
  if (!data.length) {
    return (
      <div
        className="h-[170px] grid place-items-center text-[12.5px]"
        style={{ color: "var(--dt-text-muted)" }}>
        Chưa có dữ liệu
      </div>
    );
  }
  return (
    <div className="h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 6, right: showProfit ? 2 : 0, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="dtMRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DT_COLORS.primary} stopOpacity={0.26} />
              <stop offset="100%" stopColor={DT_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF6F7" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#5A8A92", fontSize: 11 }}
            minTickGap={8}
          />
          <YAxis
            yAxisId="rev"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#5A8A92", fontSize: 10 }}
            tickFormatter={(v) => moneyAxis(Number(v))}
            width={42}
          />
          {showProfit && (
            <YAxis
              yAxisId="profit"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9A7A2A", fontSize: 10 }}
              tickFormatter={(v) => moneyAxis(Number(v))}
              width={42}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "#0D3B42",
              border: "none",
              borderRadius: 7,
              color: "#fff",
              fontSize: 12,
            }}
            labelStyle={{ color: "#A8D8E0" }}
            formatter={(value: number, name: string) => [money(value), name]}
          />
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke={DT_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#dtMRev)"
            dot={false}
          />
          {showProfit && (
            <Line
              yAxisId="profit"
              type="monotone"
              dataKey="profit"
              name="Lợi nhuận"
              stroke={DT_COLORS.gold}
              strokeWidth={2.5}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
