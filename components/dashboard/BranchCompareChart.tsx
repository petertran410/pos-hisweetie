"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { BranchComparison } from "@/lib/api/dashboard";
import { money, moneyAxis, BRANCH_PALETTE } from "@/lib/dashboard/format";

interface Props {
  data: BranchComparison;
}

/** Chuyển { labels, branches } sang dạng recharts: 1 object / label, key = tên chi nhánh. */
function toRows(data: BranchComparison) {
  return data.labels.map((label, i) => {
    const row: Record<string, number | string> = { label };
    data.branches.forEach((b) => {
      row[b.name] = b.data[i] ?? 0;
    });
    return row;
  });
}

export function BranchCompareChart({ data }: Props) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  if (!data.branches.length) {
    return (
      <div
        className="h-[268px] grid place-items-center text-sm"
        style={{ color: "var(--dt-text-muted)" }}>
        Chưa có dữ liệu so sánh chi nhánh
      </div>
    );
  }

  const rows = toRows(data);

  const toggle = (id: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      const visible = data.branches.length - next.size;
      if (next.has(id)) next.delete(id);
      else if (visible > 1) next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="h-[268px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#EAF3F4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#5A8A92", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#5A8A92", fontSize: 11 }}
              tickFormatter={(v) => moneyAxis(Number(v))}
              width={48}
            />
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
            {data.branches.map((b, i) =>
              hidden.has(b.id) ? null : (
                <Bar
                  key={b.id}
                  dataKey={b.name}
                  stackId="br"
                  fill={BRANCH_PALETTE[i % BRANCH_PALETTE.length]}
                  radius={
                    i === data.branches.length - 1 ? [4, 4, 0, 0] : undefined
                  }
                  maxBarSize={48}
                />
              )
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {data.branches.map((b, i) => {
          const off = hidden.has(b.id);
          return (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="inline-flex items-center gap-2 px-3 py-[7px] rounded-[20px] text-[12.5px] font-semibold border-[1.5px] transition"
              style={{
                borderColor: "var(--dt-border)",
                color: off ? "var(--dt-text-muted)" : "var(--dt-text)",
                background: off ? "var(--dt-bg-soft)" : "#fff",
                opacity: off ? 0.6 : 1,
              }}>
              <i
                className="w-[11px] h-[11px] rounded-[3px] flex-none"
                style={{
                  background: off
                    ? "#C2D3D6"
                    : BRANCH_PALETTE[i % BRANCH_PALETTE.length],
                }}
              />
              {b.name.split("—")[0].trim()}
              <span
                className="dt-mono font-semibold"
                style={{
                  color: "var(--dt-text-muted)",
                  textDecoration: off ? "line-through" : "none",
                }}>
                {money(b.total)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
