"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/api/dashboard";
import { money, pct, CATEGORY_PALETTE } from "@/lib/dashboard/format";

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
      <div className="h-[240px] [&_*:focus]:outline-none [&_.recharts-surface]:outline-none">
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
              strokeWidth={2.5}
              tabIndex={-1}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  tabIndex={-1}
                  style={{ outline: "none" }}
                  fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              offset={12}
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
              contentStyle={{
                background: "#fff",
                border: "1px solid var(--dt-border)",
                borderRadius: 8,
                color: "var(--dt-text-primary)",
                fontSize: 12,
                padding: "6px 10px",
                boxShadow: "0 4px 14px rgba(13,59,66,0.12)",
              }}
              formatter={(value: number, _n, item) => {
                const slice = (item?.payload ?? {}) as CategorySlice;
                return [
                  `${money(value)} (${pct(slice.percent ?? 0)})`,
                  slice.name,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-[14px] mt-[14px] text-[12.5px]">
        {data
          .map((c, i) => ({ ...c, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }))
          .filter((c) => c.percent > 0)
          .map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-[6px]"
              style={{ color: "var(--dt-text-secondary)" }}>
              <i
                className="w-[10px] h-[10px] rounded-[3px] flex-none"
                style={{ background: c.color }}
              />
              {c.name} · {pct(c.percent)}
            </span>
          ))}
      </div>
    </>
  );
}
