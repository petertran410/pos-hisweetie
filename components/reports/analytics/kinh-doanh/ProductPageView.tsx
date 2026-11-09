"use client";

import { useState } from "react";
import type {
  KdFilters,
  ProductPageData,
  SeriesSet,
} from "@/lib/api/analytics-kinh-doanh";
import { useKdInventory } from "@/lib/hooks/useAnalyticsKinhDoanh";
import { metricLabel, metricTitle } from "../analyticsFormat";
import { Panel } from "../shared/AnalyticsCharts";
import { MultiLineChart, WaterfallChart } from "./KdCharts";
import { KdPivot } from "./KdPivot";
import { Unavailable, ViewTabs } from "./KdUi";
import { full } from "./kdFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

const TOP_SERIES = 8;

const toLines = (set: SeriesSet, months: number[]) => {
  const keys = set.keys
    .filter((k): k is string => k !== null)
    .slice(0, TOP_SERIES);
  return {
    series: keys,
    xKeys: months.map((m) => ({ key: String(m), label: `Tháng ${m}` })),
    points: set.points
      .filter((p) => p.key !== null)
      .map((p) => ({ x: String(p.month), series: p.key!, value: p.value })),
    more: Math.max(0, set.keys.length - TOP_SERIES),
  };
};

/** Trang Sản Phẩm (Power BI "Báo Cáo Kinh Doanh" › Sản Phẩm). */
export function ProductPageView({
  data,
  filters,
}: {
  data: ProductPageData;
  filters: KdFilters;
}) {
  const [view, setView] = useState<"trend" | "detail" | "inventory" | "region">(
    "trend",
  );
  const [cols, setCols] = useState<"month" | "week">("month");
  const metric = data.metric;
  const months = data.period?.months ?? [];
  const brand = toLines(data.byBrand, months);
  const cat = toLines(data.byCategory, months);
  const m = metricTitle(metric);

  return (
    <div className="space-y-3">
      <ViewTabs
        value={view}
        onChange={setView}
        options={[
          { key: "trend", label: "Xu Hướng" },
          { key: "detail", label: "Chi Tiết" },
          { key: "inventory", label: "Tồn Kho" },
          { key: "region", label: "Vùng" },
        ]}
      />

      {view === "trend" && (
        <>
          <div className="grid gap-3 xl:grid-cols-[1fr_2fr]">
            <div className="dt-panel p-4 flex flex-col justify-center">
              <div className="text-[13px] font-semibold">Tổng giá trị</div>
              <div className="text-[26px] font-bold mt-1">
                {metricLabel(data.lermaoPhTotal, metric)}
              </div>
              <div
                className="text-[12px]"
                style={{ color: "var(--dt-text-muted)" }}>
                {m} hàng thương hiệu Lermao + Phượng Hoàng
              </div>
            </div>
            <Panel
              title="Tình hình tăng trưởng theo tháng"
              subtitle={`MoM ${m}`}>
              <WaterfallChart
                rows={data.waterfall.map((w) => ({
                  label: `Tháng ${w.month}`,
                  growth: w.growth,
                }))}
              />
            </Panel>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel
              title="Xu Hướng Thương Hiệu Chính"
              subtitle={
                brand.more
                  ? `Top ${TOP_SERIES} thương hiệu theo ${m.toLowerCase()}`
                  : undefined
              }>
              <MultiLineChart {...brand} metric={metric} />
            </Panel>
            <Panel
              title="Xu Hướng Theo Ngành Hàng"
              subtitle={cat.more ? `Top ${TOP_SERIES} danh mục` : undefined}>
              <MultiLineChart {...cat} metric={metric} />
            </Panel>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Unavailable
              title="Xu Hướng Theo Danh Mục Hàng"
              reason="Power BI dùng cột dim_product[sub_category_lv1], cột này không còn trong mô hình và POS chưa có cấp danh mục con."
            />
            <Unavailable
              title="Xu Hướng Theo Hương Vị"
              reason="Power BI dùng cột dim_product[sub_category_lv2] (hương vị), POS chưa có dữ liệu này."
            />
          </div>
        </>
      )}

      {view === "detail" && (
        <Panel
          title="Tổng hợp doanh số theo khách hàng"
          subtitle="Nhóm hàng 2026 › Danh mục › Tên hàng"
          right={
            <div className="dt-seg dt-seg-sm">
              {(["month", "week"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  data-on={cols === c}
                  onClick={() => setCols(c)}>
                  {c === "month" ? "Tháng" : "Tuần"}
                </button>
              ))}
            </div>
          }>
          <KdPivot
            filters={filters}
            rows={["group2026", "category", "product_name"]}
            rowLabel="Nhóm Hàng / Danh Mục / Tên Hàng"
            cols={cols}
            growth="mom"
            measures={[
              { key: "metric", label: "Giá trị" },
              { key: "growth", label: "Tăng trưởng (%)" },
            ]}
          />
        </Panel>
      )}

      {view === "inventory" && <InventoryPanel filters={filters} />}

      {view === "region" && (
        <Unavailable
          title="Topping Lermao Theo Vùng / Top Danh Mục / Top Hương Vị"
          reason="Các biểu đồ này nhóm theo dim_product[sub_category_lv1 / lv2] — POS chưa có cấp danh mục con / hương vị của sản phẩm."
        />
      )}
    </div>
  );
}

const INV_COLS = [
  "Tồn Kho",
  "Đặt NCC",
  "Khách Đặt",
  "Cận Date",
  "Bục Rách",
  "Khuyến Mãi",
];

function InventoryPanel({ filters }: { filters: KdFilters }) {
  const { data, isLoading } = useKdInventory(filters);
  const [branch, setBranch] = useState<string>("");
  if (isLoading || !data) return <div className="dt-sk h-[300px] rounded-xl" />;
  const branches = branch ? [branch] : data.branches;
  const sum = (vals: Record<string, number[]>, i: number) =>
    branches.reduce((s, b) => s + (vals[b]?.[i] ?? 0), 0);
  const rows = data.rows.filter((r) => branches.some((b) => r.values[b]));
  return (
    <Panel
      title="Báo Cáo Tồn Kho Chi Tiết"
      subtitle="Theo tồn kho hiện tại (không phụ thuộc kỳ)"
      right={
        <AnalyticsSelect
          options={data.branches.map((b) => ({ value: b, label: b }))}
          value={branch}
          onChange={setBranch}
          clearLabel="Tất cả chi nhánh"
          className="w-56"
        />
      }>
      <div
        className="border rounded-lg overflow-auto max-h-[560px]"
        style={{ borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0" style={{ background: "#F3F8F9" }}>
            <tr>
              <th className="px-2.5 py-2 text-left">Tên Hàng</th>
              {INV_COLS.map((c) => (
                <th
                  key={c}
                  className="px-2.5 py-2 text-right whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.product}
                className="border-t"
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2.5 py-1">{r.product}</td>
                {INV_COLS.map((c, i) => (
                  <td key={c} className="px-2.5 py-1 text-right dt-mono">
                    {full(sum(r.values, i)) || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
