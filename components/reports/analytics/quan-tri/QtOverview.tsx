"use client";

import type { ReactNode } from "react";
import {
  Banknote,
  Package,
  Percent,
  ShoppingCart,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { AnalyticsAxis } from "@/lib/api/analytics-reports";
import type {
  QtCard,
  QtGrowthCards,
  QtMetric,
  QtOverview,
  QtRow,
} from "@/lib/api/analytics-quan-tri";
import { DT_COLORS, money, vi } from "@/lib/dashboard/format";
import { growthDelta } from "../analyticsFormat";
import { Panel } from "../shared/AnalyticsCharts";
import { QtColumn, QtDonut, QtHBar, QtLine } from "./QtCharts";
import {
  BLANK,
  pct2,
  qtAxis,
  qtLabel,
  qtMetricTitle,
  qtValue,
} from "./qtFormat";

const AXIS_OPTIONS: { key: AnalyticsAxis; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "weekday", label: "Thứ" },
  { key: "month", label: "Tháng" },
];

export function AxisSeg({
  axis,
  onChange,
}: {
  axis: AnalyticsAxis;
  onChange: (a: AnalyticsAxis) => void;
}) {
  return (
    <div className="dt-seg dt-seg-sm">
      {AXIS_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          data-on={axis === o.key}
          onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Thẻ số + % so kỳ trước (subtitle_growth_*_samePeriod). */
export function QtKpi({
  name,
  card,
  value,
  fmt,
  compareLabel,
  icon,
  tone,
  note,
}: {
  name: string;
  card: QtCard;
  value?: number | null;
  fmt: (n: number) => string;
  compareLabel: string | null | undefined;
  icon: ReactNode;
  tone: [string, string, string];
  note?: string;
}) {
  const v = value === undefined ? card.current : value;
  const g = growthDelta(card.growth);
  return (
    <div className="flex flex-col gap-1">
      <KpiCard
        name={name}
        value={v === null || !Number.isFinite(v) ? "—" : fmt(v)}
        delta={g.delta}
        deltaDir={g.dir}
        vs={compareLabel ? `so với ${compareLabel}` : undefined}
        icon={icon}
        iconBg={tone[0]}
        iconColor={tone[1]}
        accent={tone[2]}
      />
      {note && (
        <div
          className="px-1 text-[11.5px]"
          style={{ color: "var(--dt-text-muted)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

export const TONES: Record<string, [string, string, string]> = {
  revenue: ["#E0F6F9", "#00A5B5", "#00B7CC"],
  quantity: ["#E6F2F2", "#2E8B8F", "#2E8B8F"],
  profit: ["#E8F5EC", "#27AE60", "#27AE60"],
  margin: ["#EEF3FA", "#608BC1", "#608BC1"],
  aov: ["#FBF3DF", "#9A7A2A", "#C9A84C"],
  arpc: ["#E3EEF0", "#1A5F6A", "#1A5F6A"],
};

const ico = (C: typeof Banknote) => <C className="w-[18px] h-[18px]" />;

/** 6 thẻ trang Tổng Quan. */
export function QtOverviewCards({
  cards,
  compareLabel,
}: {
  cards: QtGrowthCards;
  compareLabel: string | null;
}) {
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      <QtKpi
        name="Doanh Số"
        card={cards.revenue}
        fmt={money}
        compareLabel={compareLabel}
        icon={ico(Banknote)}
        tone={TONES.revenue}
      />
      <QtKpi
        name="Sản Lượng"
        card={cards.quantity}
        fmt={vi}
        compareLabel={compareLabel}
        icon={ico(Package)}
        tone={TONES.quantity}
      />
      <QtKpi
        name="Lợi Nhuận Gộp"
        card={cards.grossProfit}
        fmt={money}
        compareLabel={compareLabel}
        icon={ico(TrendingUp)}
        tone={TONES.profit}
      />
      <QtKpi
        name="Biên Lợi Nhuận"
        card={cards.margin}
        fmt={(n) => pct2(n)}
        compareLabel={compareLabel}
        icon={ico(Percent)}
        tone={TONES.margin}
      />
      <QtKpi
        name="AOV (giá trị TB / hoá đơn)"
        card={cards.aov}
        fmt={money}
        compareLabel={compareLabel}
        icon={ico(ShoppingCart)}
        tone={TONES.aov}
      />
      <QtKpi
        name="ARPC (doanh số TB / khách)"
        card={cards.arpc}
        fmt={money}
        compareLabel={compareLabel}
        icon={ico(UserRound)}
        tone={TONES.arpc}
      />
    </div>
  );
}

const rowsOf = (list: QtRow[], m: QtMetric) =>
  list
    .map((r) => ({ name: r.key ?? BLANK, value: qtValue(r, m) ?? 0 }))
    .sort((a, b) => b.value - a.value);

/** Các biểu đồ trang Tổng Quan (layout Power BI "Báo Cáo Quản Trị"). */
export function QtOverviewCharts({
  data,
  metric,
  axis,
  onAxisChange,
}: {
  data: QtOverview;
  metric: QtMetric;
  axis: AnalyticsAxis;
  onAxisChange: (a: AnalyticsAxis) => void;
}) {
  const charts = data.charts;
  if (!charts) return null;
  const m = qtMetricTitle(metric);
  const fmt = (v: number) => qtLabel(v, metric);
  const axisFmt = (v: number) => qtAxis(v, metric);
  const axisName = AXIS_OPTIONS.find((o) => o.key === axis)?.label ?? "Tháng";
  const year = data.period?.year ?? 0;
  const seg = <AxisSeg axis={axis} onChange={onAxisChange} />;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel
          title={`Xu Hướng ${qtMetricTitle(metric, true)} So Với Cùng Kì`}
          subtitle={`Năm ${year} so với năm ${year - 1}, theo ${axisName.toLowerCase()}`}
          right={seg}>
          <QtLine
            rows={charts.byPeriod.map((p) => ({
              name: p.label,
              cur: qtValue(p.current, metric),
              prev: qtValue(p.previous, metric),
            }))}
            fmt={fmt}
            axisFmt={axisFmt}
            curName={`Năm nay (${year})`}
            prevName={`Năm trước (${year - 1})`}
          />
        </Panel>
        <Panel title={`${m} Theo Năm`}>
          <QtColumn
            rows={charts.byYear.map((r) => ({
              name: String(r.key),
              value: qtValue(r, metric) ?? 0,
            }))}
            fmt={fmt}
            axisFmt={axisFmt}
            color={DT_COLORS.primaryMid}
            valueName={m}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel title={`${m} Theo ${axisName}`} right={seg}>
          <QtColumn
            rows={charts.byPeriod.map((p) => ({
              name: p.label,
              value: qtValue(p.current, metric) ?? 0,
            }))}
            fmt={fmt}
            axisFmt={axisFmt}
            valueName={m}
          />
        </Panel>
        <Panel title={`${m} Theo Nhóm Khách`}>
          <QtDonut rows={rowsOf(charts.byCustomerType, metric)} fmt={fmt} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={`${m} Theo Ngành Hàng Kinh Doanh`}>
          <QtDonut rows={rowsOf(charts.byProductType, metric)} fmt={fmt} />
        </Panel>
        <Panel title={`${m} Theo Danh Mục Hàng`} subtitle="Top 8">
          <QtHBar
            rows={rowsOf(charts.byCategory, metric).slice(0, 8)}
            fmt={fmt}
            color={DT_COLORS.primaryDeep}
            valueName={m}
          />
        </Panel>
        <Panel title={`${m} Theo Thương Hiệu`}>
          <QtHBar
            rows={rowsOf(charts.byBrand, metric)}
            fmt={fmt}
            color={DT_COLORS.gold}
            valueName={m}
          />
        </Panel>
        <Panel title={`${m} Theo Khách VIP Cty`} subtitle="Khách buôn · Top 40">
          <QtHBar
            rows={rowsOf(charts.byVipWholesale, metric).slice(0, 40)}
            fmt={fmt}
            valueName={m}
          />
        </Panel>
      </div>
    </div>
  );
}
