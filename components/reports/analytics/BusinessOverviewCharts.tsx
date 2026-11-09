"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
  BusinessOverview,
  MetricRow,
} from "@/lib/api/analytics-reports";
import { DT_COLORS } from "@/lib/dashboard/format";
import {
  ColumnChart,
  DonutChart,
  Empty,
  HBarChart,
  Panel,
  axisTick,
} from "./shared/AnalyticsCharts";
import {
  BLANK_LABEL,
  TOOLTIP_STYLE,
  metricAxis,
  metricLabel,
  metricTitle,
  metricValue,
} from "./analyticsFormat";

const AXIS_OPTIONS: { key: AnalyticsAxis; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "weekday", label: "Thứ" },
  { key: "month", label: "Tháng" },
];

const toRows = (list: MetricRow[], metric: AnalyticsMetric) =>
  list
    .map((r) => ({ name: r.key ?? BLANK_LABEL, value: metricValue(r, metric) }))
    .sort((a, b) => b.value - a.value);

interface Props {
  data: BusinessOverview;
  metric: AnalyticsMetric;
  axis: AnalyticsAxis;
  onAxisChange: (a: AnalyticsAxis) => void;
}

/** Các biểu đồ của trang Tổng Quan (theo layout Power BI "Báo Cáo Kinh Doanh"). */
export function BusinessOverviewCharts({
  data,
  metric,
  axis,
  onAxisChange,
}: Props) {
  const charts = data.charts;
  if (!charts) return null;
  const m = metricTitle(metric);
  const axisName =
    axis === "day" ? "Ngày" : axis === "weekday" ? "Thứ" : "Tháng";

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

  const trend = charts.byPeriod.map((p) => ({
    name: p.label,
    cur: metricValue(p.current, metric),
    prev: metricValue(p.previous, metric),
  }));
  const byPeriod = charts.byPeriod.map((p) => ({
    name: p.label,
    value: metricValue(p.current, metric),
  }));
  const byYear = charts.byYear.map((r) => ({
    name: String(r.key),
    value: metricValue(r, metric),
  }));
  const year = data.period?.year ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel
          title={`Xu Hướng ${metricTitle(metric, true)} So Với Cùng Kì`}
          subtitle={`Năm ${year} so với năm ${year - 1}, theo ${axisName.toLowerCase()}`}
          right={axisSeg}>
          {trend.length ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trend}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E3EEF0"
                  />
                  <XAxis
                    dataKey="name"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v) => metricAxis(Number(v), metric)}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v, n) => [
                      metricLabel(Number(v), metric),
                      n === "cur" ? `Năm ${year}` : `Năm ${year - 1}`,
                    ]}
                  />
                  <Legend
                    formatter={(v) =>
                      v === "cur"
                        ? `Năm nay (${year})`
                        : `Năm trước (${year - 1})`
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cur"
                    stroke={DT_COLORS.primary}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prev"
                    stroke={DT_COLORS.gold}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title={`${m} Theo Năm`}>
          <ColumnChart
            rows={byYear}
            metric={metric}
            color={DT_COLORS.primaryMid}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Panel title={`${m} Theo ${axisName}`} right={axisSeg}>
          <ColumnChart
            rows={byPeriod}
            metric={metric}
            color={DT_COLORS.primary}
          />
        </Panel>
        <Panel title={`${m} Theo Nhóm Khách`}>
          <DonutChart
            rows={toRows(charts.byCustomerType, metric)}
            metric={metric}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={`${m} Theo Ngành Hàng Kinh Doanh`}>
          <DonutChart
            rows={toRows(charts.byProductType, metric)}
            metric={metric}
          />
        </Panel>
        <Panel title={`${m} Theo Danh Mục Hàng`} subtitle="Top 8">
          <HBarChart
            rows={toRows(charts.byCategory, metric).slice(0, 8)}
            metric={metric}
            color={DT_COLORS.primaryDeep}
          />
        </Panel>
        <Panel title={`${m} Theo Thương Hiệu`}>
          <HBarChart
            rows={toRows(charts.byBrand, metric)}
            metric={metric}
            color={DT_COLORS.gold}
          />
        </Panel>
        <Panel title={`${m} Theo Khách VIP Cty`}>
          <HBarChart
            rows={toRows(charts.byVipCustomer, metric)}
            metric={metric}
            color={DT_COLORS.primary}
          />
        </Panel>
      </div>
    </div>
  );
}
