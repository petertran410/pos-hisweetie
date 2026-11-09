"use client";

import {
  BadgeCheck,
  Handshake,
  Hourglass,
  MessagesSquare,
  Percent,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import { KpiCard, type DeltaDir } from "@/components/dashboard/KpiCard";
import { deltaPct, pct, vi } from "@/lib/dashboard/format";
import type {
  LeadDurationKpi,
  LeadKpi,
  LeadKpis,
} from "@/lib/dashboard/lead/leadDashboard.types";
import { durationParts } from "@/lib/dashboard/lead/leadFormat";

type Better = "up" | "down" | "none";

function delta(k: LeadKpi | LeadDurationKpi, better: Better) {
  if (k.changePct === null)
    return { delta: "—", deltaDir: "flat" as DeltaDir, deltaTone: "neutral" as const };
  const dir: DeltaDir = k.changePct > 0 ? "up" : k.changePct < 0 ? "down" : "flat";
  const tone =
    better === "none" || dir === "flat"
      ? "neutral"
      : dir === better
        ? "good"
        : "bad";
  return { delta: deltaPct(k.changePct), deltaDir: dir, deltaTone: tone as "good" | "bad" | "neutral" };
}

export function LeadKpiGrid({
  kpis,
  compareLabel,
}: {
  kpis: LeadKpis;
  compareLabel: string | null;
}) {
  const vs = compareLabel ? `so với ${compareLabel}` : undefined;
  const icon = "w-[18px] h-[18px]";

  const count = (
    name: string,
    k: LeadKpi,
    ic: React.ReactNode,
    c: [bg: string, fg: string, accent: string],
    better: Better,
  ) => (
    <KpiCard
      name={name}
      value={vi(k.value)}
      {...delta(k, better)}
      vs={vs}
      icon={ic}
      iconBg={c[0]}
      iconColor={c[1]}
      accent={c[2]}
    />
  );

  const time = (name: string, k: LeadDurationKpi, ic: React.ReactNode) => {
    const d = k.value === null ? { value: "—", suffix: "" } : durationParts(k.value);
    return (
      <KpiCard
        name={name}
        value={d.value}
        valueSuffix={d.suffix || undefined}
        {...delta(k, "down")}
        vs={vs}
        icon={ic}
        iconBg="#E3EEF0"
        iconColor="#1A5F6A"
        accent="#1A5F6A"
      />
    );
  };

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {count("Tổng lead", kpis.total, <Users className={icon} />, ["#E0F6F9", "#00A5B5", "#00B7CC"], "up")}
      {count("Lead mới", kpis.newLeads, <UserPlus className={icon} />, ["#E0F6F9", "#00A5B5", "#00B7CC"], "none")}
      {count("Đang chăm sóc", kpis.caring, <MessagesSquare className={icon} />, ["#FBF3DF", "#9A7A2A", "#C9A84C"], "none")}
      {count("Đã chuyển Sale", kpis.handedOver, <Handshake className={icon} />, ["#E6F2F2", "#2E8B8F", "#2E8B8F"], "up")}
      {count("Đã chuyển đổi", kpis.converted, <BadgeCheck className={icon} />, ["#E6F2F2", "#2E8B8F", "#2E8B8F"], "up")}
      <KpiCard
        name="Tỷ lệ chuyển đổi"
        value={pct(kpis.conversionRate.value).replace("%", "")}
        valueSuffix="%"
        {...delta(kpis.conversionRate, "up")}
        vs={vs}
        icon={<Percent className={icon} />}
        iconBg="#FBF3DF"
        iconColor="#9A7A2A"
        accent="#C9A84C"
      />
      {time("TG TB: lead → chuyển Sale", kpis.avgHoursToHandover, <Timer className={icon} />)}
      {time("TG TB: lead → đơn đầu", kpis.avgHoursToFirstOrder, <Hourglass className={icon} />)}
    </div>
  );
}
