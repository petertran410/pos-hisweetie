"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/api/dashboard";
import { money, CATEGORY_PALETTE } from "@/lib/dashboard/format";

interface Props {
  data: CategorySlice[];
}

export function CategoryDonut({ data }: Props) {
  if (!data.length) {
    return (
      <div
        className="h-[240px] grid place-items-center text-sm"
        style={{ color: "var(--dt-text-muted)" }}>
        Chưa có dữ liệu nhóm hàng
      </div>
    );
  }

  return (
    <>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1.5}
              stroke="#fff"
              strokeWidth={2.5}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0D3B42",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(value: number, _n, item) => {
                const slice = (item?.payload ?? {}) as CategorySlice;
                return [`${money(value)} (${slice.percent ?? 0}%)`, slice.name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-[14px] mt-[14px] text-[12.5px]">
        {data.map((c, i) => (
          <span
            key={c.name}
            className="inline-flex items-center gap-[6px]"
            style={{ color: "var(--dt-text-secondary)" }}>
            <i
              className="w-[10px] h-[10px] rounded-[3px] flex-none"
              style={{
                background: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
              }}
            />
            {c.name} · {c.percent}%
          </span>
        ))}
      </div>
    </>
  );
}
