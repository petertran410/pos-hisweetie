"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DT_COLORS } from "@/lib/dashboard/format";
import type {
  LeadGranularity,
  LeadTrend,
} from "@/lib/dashboard/lead/leadDashboard.types";
import { LeadCard, TOOLTIP_STYLE } from "./leadUi";

const OPTIONS: { key: LeadGranularity; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

export function LeadTrendCard({ trend }: { trend: LeadTrend }) {
  const [g, setG] = useState<LeadGranularity>("day");
  const data = trend[g];

  return (
    <LeadCard
      title="Xu hướng lead"
      subtitle="Lead mới và lead chuyển đổi theo thời gian"
      right={
        <div className="dt-seg dt-seg-sm">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              data-on={g === o.key}
              onClick={() => setG(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      }>
      <div className="h-[268px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#EAF3F4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#5A8A92", fontSize: 11 }}
              minTickGap={14}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: "#5A8A92", fontSize: 11 }}
              width={40}
            />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="newLeads"
              name="Lead mới"
              stroke={DT_COLORS.primary}
              strokeWidth={2.5}
              dot={g === "day" ? false : { r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="converted"
              name="Lead chuyển đổi"
              stroke={DT_COLORS.gold}
              strokeWidth={2.5}
              dot={g === "day" ? false : { r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </LeadCard>
  );
}
