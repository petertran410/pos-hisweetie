"use client";

import type { TopBuyer } from "@/lib/api/dashboard";
import { money, moneyAxis } from "@/lib/dashboard/format";
import { HBarChart } from "./HBarChart";

/** Top khách mua nhiều nhất — biểu đồ thanh ngang theo tổng tiền hóa đơn. */
export function TopBuyers({
  items,
  loading,
}: {
  items: TopBuyer[];
  loading?: boolean;
}) {
  return (
    <HBarChart
      loading={loading}
      items={items.map((c) => ({
        id: c.id,
        label: c.name,
        value: c.totalRevenue,
        title: `${c.name} (${c.code}) — ${money(c.totalRevenue)} · ${c.invoiceCount} hóa đơn`,
      }))}
      formatValue={money}
      formatAxis={moneyAxis}
    />
  );
}
