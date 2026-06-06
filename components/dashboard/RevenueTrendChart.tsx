"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "@/lib/api/dashboard";
import { money, moneyAxis, DT_COLORS } from "@/lib/dashboard/format";

interface Props {
  data: TrendPoint[];
  showProfit: boolean;
}

export function RevenueTrendChart({ data, showProfit }: Props) {
  if (!data.length) {
    return (
      <div
        className="h-[268px] grid place-items-center text-sm"
        style={{ color: "var(--dt-text-muted)" }}>
        Chưa có dữ liệu trong kỳ đã chọn
      </div>
    );
  }

  return (
    <div className="h-[268px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: showProfit ? 8 : 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="dtRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DT_COLORS.primary} stopOpacity={0.28} />
              <stop offset="100%" stopColor={DT_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EAF3F4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#5A8A92", fontSize: 12 }}
          />
          <YAxis
            yAxisId="rev"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#5A8A92", fontSize: 11 }}
            tickFormatter={(v) => moneyAxis(Number(v))}
            width={48}
          />
          {showProfit && (
            <YAxis
              yAxisId="profit"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9A7A2A", fontSize: 11 }}
              tickFormatter={(v) => moneyAxis(Number(v))}
              width={48}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "#0D3B42",
              border: "none",
              borderRadius: 6,
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
            fill="url(#dtRevGrad)"
            dot={false}
            activeDot={{ r: 5 }}
          />
          {showProfit && (
            <Line
              yAxisId="profit"
              type="monotone"
              dataKey="profit"
              name="Lợi nhuận (tạm tính)"
              stroke={DT_COLORS.gold}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
