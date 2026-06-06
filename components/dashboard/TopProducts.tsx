"use client";

import type { TopProduct, TopMetric } from "@/lib/api/dashboard";
import { money, vi } from "@/lib/dashboard/format";

interface Props {
  items: TopProduct[];
  metric: TopMetric;
}

const METRIC_GRAD: Record<TopMetric, string> = {
  rev: "linear-gradient(90deg,#00B7CC,#2E8B8F)",
  qty: "linear-gradient(90deg,#1A5F6A,#00B7CC)",
  profit: "linear-gradient(90deg,#E8C96A,#C9A84C)",
};

const METRIC_SUB: Record<TopMetric, string> = {
  rev: "doanh thu",
  qty: "sản lượng",
  profit: "lợi nhuận",
};

export function TopProducts({ items, metric }: Props) {
  if (!items.length) {
    return (
      <div className="text-center py-7 text-[13.5px]" style={{ color: "var(--dt-text-muted)" }}>
        Nhóm hàng này chưa có dữ liệu trong kỳ đã chọn.
      </div>
    );
  }

  const valOf = (p: TopProduct) =>
    metric === "qty" ? p.totalQuantity : metric === "profit" ? p.totalProfit : p.totalRevenue;

  const total = items.reduce((s, p) => s + valOf(p), 0) || 1;
  const max = Math.max(...items.map(valOf)) || 1;

  return (
    <div className="grid gap-[14px] grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
      {items.map((p, i) => {
        const v = valOf(p);
        const pct = ((v / total) * 100).toFixed(1);
        const rankColor = metric === "profit" ? "#9A7A2A" : "var(--dt-primary)";
        return (
          <div
            key={p.productId}
            className="rounded-[8px] border p-4 transition hover:-translate-y-[2px]"
            style={{ background: "var(--dt-bg-soft)", borderColor: "var(--dt-border)" }}>
            <div className="dt-mono font-bold text-[13px]" style={{ color: rankColor }}>
              #{i + 1}
            </div>
            <div className="font-semibold text-[13.5px] my-2 min-h-[40px] leading-snug">
              {p.name}
              <small className="block font-normal text-[11.5px] mt-[3px]" style={{ color: "var(--dt-text-muted)" }}>
                {p.code}
              </small>
            </div>
            <div className="dt-mono font-bold text-[18px]">
              {metric === "qty" ? vi(p.totalQuantity) : money(v)}
            </div>
            <div
              className="h-[6px] rounded-[6px] overflow-hidden my-[9px]"
              style={{ background: "var(--dt-cyan-bg)" }}>
              <span
                className="block h-full rounded-[6px] dt-bar-fill"
                style={{ width: `${(v / max) * 100}%`, background: METRIC_GRAD[metric] }}
              />
            </div>
            <div className="text-[11.5px]" style={{ color: "var(--dt-text-muted)" }}>
              {pct}% {METRIC_SUB[metric]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
