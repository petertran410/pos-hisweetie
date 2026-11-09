"use client";

import type { ReactNode } from "react";
import {
  Banknote,
  Crown,
  KeyRound,
  ShoppingCart,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
  CardValue,
  MetricRow,
} from "@/lib/api/analytics-reports";
import type { KhMonthRow, KhOverview } from "@/lib/api/analytics-khach-hang";
import { DT_COLORS, vi } from "@/lib/dashboard/format";
import {
  BLANK_LABEL,
  growthDelta,
  metricLabel,
  metricTitle,
  metricValue,
} from "../analyticsFormat";
import { DonutChart, HBarChart, Panel } from "../shared/AnalyticsCharts";
import { AXIS_OPTIONS, StackedPercentChart, TrendLineChart } from "./KhCharts";

const money = (v: number) => metricLabel(v, "amount");

const toRows = (list: MetricRow[], metric: AnalyticsMetric) =>
  list
    .map((r) => ({ name: r.key ?? BLANK_LABEL, value: metricValue(r, metric) }))
    .filter((r) => r.value)
    .sort((a, b) => b.value - a.value);

/** Giữ 11 phần lớn nhất, gộp phần còn lại thành "Khác" (cho biểu đồ tròn dễ đọc). */
const topWithOther = (rows: { name: string; value: number }[], n = 11) =>
  rows.length <= n + 1
    ? rows
    : [
        ...rows.slice(0, n),
        { name: "Khác", value: rows.slice(n).reduce((s, r) => s + r.value, 0) },
      ];

/** Trang Tất Cả: 8 thẻ + các biểu đồ theo layout Power BI "Báo Cáo Khách Hàng". */
export function KhOverviewView({
  data,
  metric,
  axis,
  onAxisChange,
}: {
  data: KhOverview;
  metric: AnalyticsMetric;
  axis: AnalyticsAxis;
  onAxisChange: (a: AnalyticsAxis) => void;
}) {
  const cards = data.cards;
  const charts = data.charts;
  if (!cards || !charts) return null;
  const vs = data.compareLabel ? `vs ${data.compareLabel}` : undefined;
  const year = data.period?.year ?? 0;

  const card = (
    name: string,
    v: CardValue,
    fmt: (n: number) => string,
    icon: ReactNode,
    color: string,
    bg: string,
    withGrowth = true,
  ) => {
    const g = growthDelta(v.growth);
    return (
      <KpiCard
        name={name}
        value={v.current === null ? "—" : fmt(v.current)}
        delta={withGrowth ? g.delta : undefined}
        deltaDir={g.dir}
        vs={withGrowth ? vs : undefined}
        icon={icon}
        iconBg={bg}
        iconColor={color}
        accent={color}
      />
    );
  };
  const ic = "w-[18px] h-[18px]";

  const axisSeg = (
    <div className="dt-seg dt-seg-sm">
      {AXIS_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          data-on={axis === o.key}
          onClick={() => onAxisChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  const trend = charts.trend.map((p) => ({
    name: p.label,
    cur: metricValue(p.current, metric),
    prev: metricValue(p.previous, metric),
  }));
  const monthRows = (list: KhMonthRow[]) =>
    list.map((r) => ({
      group: `Tháng ${r.m}`,
      series: r.key,
      value: metricValue(r, metric),
    }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {card(
          "Doanh Số",
          cards.revenue,
          money,
          <Banknote className={ic} />,
          "#00A5B5",
          "#E0F6F9",
        )}
        {card(
          "Khách Mua Hàng",
          cards.activeCustomers,
          vi,
          <Users className={ic} />,
          "#2E8B8F",
          "#E6F2F2",
          false,
        )}
        {card(
          "AOV",
          cards.aov,
          money,
          <ShoppingCart className={ic} />,
          "#9A7A2A",
          "#FBF3DF",
        )}
        {card(
          "ARPC",
          cards.arpc,
          money,
          <UserRound className={ic} />,
          "#1A5F6A",
          "#E3EEF0",
        )}
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {card(
          "Khách mới",
          cards.newCustomers,
          vi,
          <UserPlus className={ic} />,
          "#00A5B5",
          "#E0F6F9",
        )}
        {card(
          "DS Khách Mới",
          cards.revenueNew,
          money,
          <Sparkles className={ic} />,
          "#2E8B8F",
          "#E6F2F2",
        )}
        {card(
          "DS Key PerSale",
          cards.keyPerSale,
          money,
          <KeyRound className={ic} />,
          "#9A7A2A",
          "#FBF3DF",
        )}
        {card(
          "Doanh Số VIP",
          cards.vip,
          money,
          <Crown className={ic} />,
          "#1A5F6A",
          "#E3EEF0",
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="Tình hình mua hàng của khách"
          subtitle={`${metricTitle(metric, true)} năm ${year} so với năm ${year - 1}`}
          right={axisSeg}>
          <TrendLineChart rows={trend} metric={metric} year={year} />
        </Panel>
        <Panel title={`${metricTitle(metric)} Theo Miền`}>
          <DonutChart rows={toRows(charts.byRegion, metric)} metric={metric} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Tình hình khách mua theo tháng"
          subtitle="Theo ngành hàng">
          <StackedPercentChart
            rows={monthRows(charts.byMonthProductType)}
            metric={metric}
          />
        </Panel>
        <Panel title="Tỷ trọng loại khách theo tháng">
          <StackedPercentChart
            rows={monthRows(charts.byMonthCustomerType)}
            metric={metric}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel
          title="Top 10 Khách Bán Chạy Nhất"
          subtitle="Top 10 khách theo tên, gộp theo khách cha">
          <HBarChart
            rows={charts.topParents[metric]}
            metric={metric}
            color={DT_COLORS.primary}
          />
        </Panel>
        <Panel
          title={`${metricTitle(metric)} Theo Tỉnh`}
          subtitle="Không áp bộ lọc thương hiệu (như bản đồ Power BI)">
          <HBarChart
            rows={toRows(charts.byProvince, metric)}
            metric={metric}
            color={DT_COLORS.primaryDeep}
          />
        </Panel>
        <Panel title="Danh Mục Hàng Của Khách">
          <DonutChart
            rows={topWithOther(toRows(charts.byCategory, metric))}
            metric={metric}
          />
        </Panel>
      </div>
    </div>
  );
}
