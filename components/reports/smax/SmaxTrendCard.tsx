"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DT_COLORS } from "@/lib/dashboard/format";
import type { SmaxTrendPoint } from "@/lib/dashboard/smax/smaxDashboard.types";
import { LeadCard, TOOLTIP_STYLE } from "@/components/reports/lead/leadUi";

const AXIS_TICK = { fill: "#5A8A92", fontSize: 11 };

export function SmaxTrendCard({ trend }: { trend: SmaxTrendPoint[] }) {
  return (
    <LeadCard
      title="Xu hướng theo ngày"
      subtitle="Tin gửi từ POS (trực tiếp / nhóm) và lượt gắn khách">
      <div className="h-[268px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#EAF3F4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              minTickGap={14}
            />
            <YAxis
              yAxisId="msg"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={AXIS_TICK}
              width={40}
            />
            <YAxis
              yAxisId="link"
              orientation="right"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={AXIS_TICK}
              width={32}
            />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="msg"
              dataKey="direct"
              name="Tin trực tiếp"
              stackId="msg"
              fill={DT_COLORS.primary}
              maxBarSize={28}
            />
            <Bar
              yAxisId="msg"
              dataKey="group"
              name="Tin nhóm"
              stackId="msg"
              fill={DT_COLORS.cyanSoft}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="link"
              type="monotone"
              dataKey="links"
              name="Lượt gắn khách"
              stroke={DT_COLORS.gold}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </LeadCard>
  );
}
