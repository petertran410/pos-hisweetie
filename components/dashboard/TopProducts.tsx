"use client";

import type { TopProduct, TopMetric } from "@/lib/api/dashboard";
import { money, moneyAxis, vi } from "@/lib/dashboard/format";
import { HBarChart } from "./HBarChart";

interface Props {
  items: TopProduct[];
  metric: TopMetric;
  loading?: boolean;
}

const METRIC_COLOR: Record<TopMetric, string> = {
  rev: "var(--dt-primary)",
  qty: "var(--dt-primary)",
  profit: "linear-gradient(90deg,#E8C96A,#C9A84C)",
};

/** Trục số lượng: 600, 1,2k, 3,6k. */
export const qtyAxis = (n: number) =>
  n >= 1000
    ? (n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "k"
    : vi(n);

/** Số lượng gọn: 912, 2,8k. */
const qtyShort = (n: number) => (n >= 10000 ? qtyAxis(n) : vi(n));

/** Top hàng bán chạy — biểu đồ thanh ngang. */
export function TopProducts({ items, metric, loading }: Props) {
  const valOf = (p: TopProduct) =>
    metric === "qty"
      ? p.totalQuantity
      : metric === "profit"
        ? p.totalProfit
        : p.totalRevenue;
  const fmt = metric === "qty" ? qtyShort : money;

  return (
    <HBarChart
      loading={loading}
      items={items.map((p) => ({
        id: p.productId,
        label: p.name,
        value: valOf(p),
        title: `${p.name} (${p.code}) — ${metric === "qty" ? vi(valOf(p)) : money(valOf(p))}`,
      }))}
      formatValue={fmt}
      formatAxis={metric === "qty" ? qtyAxis : moneyAxis}
      integer={metric === "qty"}
      barColor={METRIC_COLOR[metric]}
    />
  );
}
