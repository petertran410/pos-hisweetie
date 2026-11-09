"use client";

import { Banknote, Package, ShoppingCart, UserRound } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { BusinessOverview, CardValue } from "@/lib/api/analytics-reports";
import { money, vi } from "@/lib/dashboard/format";
import { growthDelta } from "./analyticsFormat";

/** 4 thẻ của trang Tổng Quan: Doanh Số, Sản Lượng, AOV, ARPC (kèm % so kỳ trước). */
export function BusinessOverviewCards({ data }: { data: BusinessOverview }) {
  const cards = data.cards;
  if (!cards) return null;
  const label = data.compareLabel;

  const item = (
    name: string,
    v: CardValue,
    fmt: (n: number) => string,
    icon: React.ReactNode,
    iconBg: string,
    iconColor: string,
    accent: string,
  ) => {
    const g = growthDelta(v.growth);
    return (
      <KpiCard
        name={name}
        value={v.current === null ? "—" : fmt(v.current)}
        delta={g.delta}
        deltaDir={g.dir}
        vs={label ? `so với ${label}` : undefined}
        icon={icon}
        iconBg={iconBg}
        iconColor={iconColor}
        accent={accent}
      />
    );
  };

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
      {item(
        "Doanh Số",
        cards.revenue,
        money,
        <Banknote className="w-[18px] h-[18px]" />,
        "#E0F6F9",
        "#00A5B5",
        "#00B7CC",
      )}
      {item(
        "Sản Lượng",
        cards.quantity,
        vi,
        <Package className="w-[18px] h-[18px]" />,
        "#E6F2F2",
        "#2E8B8F",
        "#2E8B8F",
      )}
      {item(
        "AOV (giá trị TB / hoá đơn)",
        cards.aov,
        money,
        <ShoppingCart className="w-[18px] h-[18px]" />,
        "#FBF3DF",
        "#9A7A2A",
        "#C9A84C",
      )}
      {item(
        "ARPC (doanh số TB / khách)",
        cards.arpc,
        money,
        <UserRound className="w-[18px] h-[18px]" />,
        "#E3EEF0",
        "#1A5F6A",
        "#1A5F6A",
      )}
    </div>
  );
}
