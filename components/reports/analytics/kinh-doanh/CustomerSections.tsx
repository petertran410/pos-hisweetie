"use client";

import { Fragment, useState } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  KeyRound,
  ShoppingCart,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  Crown,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type {
  CustomerSectionData,
  GrowthCard,
  KdFilters,
  KeyValue,
  LineListing,
  RepeatCell,
  PivotDim,
} from "@/lib/api/analytics-kinh-doanh";
import { DT_COLORS, money, vi } from "@/lib/dashboard/format";
import { BLANK_LABEL, growthDelta, metricTitle } from "../analyticsFormat";
import { DonutChart, HBarChart, Panel } from "../shared/AnalyticsCharts";
import { AnalyticsTable } from "../shared/AnalyticsTable";
import {
  CurPrevLineChart,
  MultiLineChart,
  SimpleColumns,
  StackedPercentChart,
  WaterfallChart,
} from "./KdCharts";
import { KdPivot } from "./KdPivot";
import { BarCell, MiniTable } from "./KdUi";
import { C, fmtDate, full, int, pbiGrowthColor, pct } from "./kdFormat";

const kv = (list: KeyValue[] = []) =>
  list.map((r) => ({ name: r.key ?? BLANK_LABEL, value: r.value }));
const months = (d: CustomerSectionData) =>
  [...new Set((d.waterfall ?? []).map((w) => w.month))].map((m) => ({
    key: String(m),
    label: `Tháng ${m}`,
  }));

export const AXIS_OPTIONS = [
  { key: "day", label: "Ngày" },
  { key: "weekday", label: "Thứ" },
  { key: "month", label: "Tháng" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tất Cả
// ─────────────────────────────────────────────────────────────────────────────
export function OverviewSection({
  data,
  axisSeg,
}: {
  data: CustomerSectionData;
  axisSeg: React.ReactNode;
}) {
  const metric = (data.metric ?? "amount") as AnalyticsMetric;
  const m = metricTitle(metric);
  const vs = data.compareLabel ? `so với ${data.compareLabel}` : undefined;
  const card = (
    name: string,
    v: GrowthCard | undefined,
    fmt: (n: number) => string,
    icon: React.ReactNode,
    accent: string,
  ) => {
    const g = growthDelta(v?.growth ?? null);
    return (
      <KpiCard
        name={name}
        value={
          v?.current === null || v?.current === undefined ? "—" : fmt(v.current)
        }
        delta={g.delta}
        deltaDir={g.dir}
        vs={vs}
        icon={icon}
        iconBg="#E0F6F9"
        iconColor={accent}
        accent={accent}
      />
    );
  };
  const c = data.cards;
  const mk = months(data);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {card(
          "Doanh Số",
          c?.revenue,
          money,
          <Banknote className="w-[18px] h-[18px]" />,
          "#00A5B5",
        )}
        {card(
          "Khách Mua Hàng",
          c?.activeCustomers,
          vi,
          <Users className="w-[18px] h-[18px]" />,
          "#2E8B8F",
        )}
        {card(
          "Khách mới",
          c?.newCustomers,
          vi,
          <UserPlus className="w-[18px] h-[18px]" />,
          "#1A5F6A",
        )}
        {card(
          "DS Khách Mới",
          c?.newRevenue,
          money,
          <Sparkles className="w-[18px] h-[18px]" />,
          "#C9A84C",
        )}
        {card(
          "DS Key PerSale",
          c?.keyPerSale,
          money,
          <KeyRound className="w-[18px] h-[18px]" />,
          "#00A5B5",
        )}
        {card(
          "Doanh Số VIP",
          c?.vip,
          money,
          <Crown className="w-[18px] h-[18px]" />,
          "#9A7A2A",
        )}
        {card(
          "ARPC",
          c?.arpc,
          money,
          <UserRound className="w-[18px] h-[18px]" />,
          "#1A5F6A",
        )}
        {card(
          "AOV",
          c?.aov,
          money,
          <ShoppingCart className="w-[18px] h-[18px]" />,
          "#2E8B8F",
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Tình hình mua hàng của khách"
          subtitle="Năm nay so với năm trước"
          right={axisSeg}>
          <CurPrevLineChart
            rows={(data.trend ?? []).map((t) => ({
              label: t.label,
              current: t.current ?? 0,
              previous: t.previous ?? 0,
            }))}
            metric={metric}
          />
        </Panel>
        <Panel title="Tỷ trọng loại khách theo tháng">
          <StackedPercentChart
            xKeys={mk}
            points={(data.byCustomerTypeMonth ?? []).map((p) => ({
              x: String(p.month),
              series: p.key ?? BLANK_LABEL,
              value: p.value,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Tình hình khách mua theo tháng"
          subtitle="Tỷ trọng theo loại hàng">
          <StackedPercentChart
            xKeys={mk}
            points={(data.byProductTypeMonth ?? []).map((p) => ({
              x: String(p.month),
              series: p.key ?? BLANK_LABEL,
              value: p.value,
            }))}
          />
        </Panel>
        <Panel title="Tình Hình Tăng Trưởng Qua Tháng" subtitle={`MoM ${m}`}>
          <WaterfallChart
            rows={(data.waterfall ?? []).map((w) => ({
              label: `Tháng ${w.month}`,
              growth: w.growth,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel title="Top 10 Khách Bán Chạy Nhất">
          <HBarChart
            rows={kv(data.topCustomers)}
            metric={metric}
            color={DT_COLORS.primary}
          />
        </Panel>
        <Panel title={`${m} Theo Miền`}>
          <DonutChart rows={kv(data.byRegion)} metric={metric} />
        </Panel>
        <Panel title="Danh Mục Hàng Của Khách">
          <DonutChart rows={kv(data.byCategory)} metric={metric} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title={`${m} Theo Tỉnh`}
          subtitle="Thay bản đồ Power BI · không lọc theo thương hiệu">
          <HBarChart
            rows={kv(data.byProvince)}
            metric={metric}
            color={DT_COLORS.primaryDeep}
            maxHeight={420}
          />
        </Panel>
        <Panel title="Tình hình kinh doanh theo nhóm khách">
          <AnalyticsTable
            columns={[
              {
                key: "key",
                label: "Nhóm khách",
                format: (v) =>
                  v === "__total__" ? "Tổng" : String(v ?? BLANK_LABEL),
              },
              {
                key: "quantity",
                label: "Sản Lượng",
                align: "right",
                format: (v) => full(Number(v)),
              },
              {
                key: "orders",
                label: "Hóa Đơn",
                align: "right",
                format: (v) => full(Number(v)),
              },
              {
                key: "revenue",
                label: "Doanh Số",
                align: "right",
                format: (v) => full(Number(v)),
              },
              {
                key: "aov",
                label: "AOV",
                align: "right",
                format: (v) => (v === null ? "" : full(Number(v))),
              },
              {
                key: "aoc",
                label: "AOC",
                align: "right",
                format: (v) =>
                  v === null
                    ? ""
                    : Number(v).toLocaleString("vi-VN", {
                        maximumFractionDigits: 2,
                      }),
              },
              {
                key: "arpc",
                label: "ARPC",
                align: "right",
                format: (v) => (v === null ? "" : full(Number(v))),
              },
              {
                key: "newCustomers",
                label: "Số Lượng Khách Mới",
                align: "right",
                format: (v) => full(Number(v)),
              },
            ]}
            rows={(data.byCustomerType ?? []).filter(
              (r) => r.key !== "__total__",
            )}
            totals={
              (data.byCustomerType ?? []).find((r) => r.key === "__total__") ??
              null
            }
            rowKey={(r) => String(r.key)}
          />
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vùng
// ─────────────────────────────────────────────────────────────────────────────
export function RegionSection({
  data,
  axisSeg,
}: {
  data: CustomerSectionData;
  axisSeg: React.ReactNode;
}) {
  const metric = (data.metric ?? "amount") as AnalyticsMetric;
  const regions = [
    ...new Set(
      ((data.trend as unknown as { region: string | null }[]) ?? []).map(
        (t) => t.region ?? BLANK_LABEL,
      ),
    ),
  ];
  return (
    <div className="space-y-3">
      <Panel
        title="Tình hình mua hàng của khách"
        subtitle="Theo vùng"
        right={axisSeg}>
        <MultiLineChart
          xKeys={data.axisKeys ?? []}
          series={regions}
          points={(
            (data.trend ?? []) as unknown as {
              region: string | null;
              key: string;
              value: number;
            }[]
          ).map((t) => ({
            x: t.key,
            series: t.region ?? BLANK_LABEL,
            value: t.value,
          }))}
          metric={metric}
        />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
        <Panel title="Tình hình mua hàng của khách theo vùng">
          <AnalyticsTable
            columns={[
              {
                key: "key",
                label: "Vùng",
                format: (v) =>
                  v === "__total__" ? "Tổng" : String(v ?? BLANK_LABEL),
              },
              {
                key: "revenue",
                label: "Tổng Tiền Hàng",
                align: "right",
                format: (v) => full(Number(v)),
              },
              {
                key: "activeCustomers",
                label: "Khách Mua Hàng",
                align: "right",
                format: (v) => full(Number(v)),
              },
              {
                key: "aov",
                label: "AOV",
                align: "right",
                format: (v) => (v === null ? "" : full(Number(v))),
              },
              {
                key: "newCustomers",
                label: "Khách Mới",
                align: "right",
                format: (v) => full(Number(v)),
              },
            ]}
            rows={(data.table ?? []).filter((r) => r.key !== "__total__")}
            totals={
              (data.table ?? []).find((r) => r.key === "__total__") ?? null
            }
            rowKey={(r) => String(r.key)}
          />
        </Panel>
        <Panel title={`${metricTitle(metric)} Theo Miền`}>
          <DonutChart rows={kv(data.byRegion)} metric={metric} />
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chi Tiết
// ─────────────────────────────────────────────────────────────────────────────
/** Hai bảng pivot của mục Chi Tiết (trang gửi sớm request với cột mặc định). */
export const DETAIL_PIVOT_REGION = {
  rows: ["region", "parent_name", "product_name"] as PivotDim[],
  growth: "mom" as const,
};
export const DETAIL_PIVOT_WEEK = {
  rows: ["parent_name", "product_name"] as PivotDim[],
  cols: "week" as const,
  growth: "wow" as const,
};

export function DetailSection({
  data,
  filters,
}: {
  data: CustomerSectionData;
  filters: KdFilters;
}) {
  const [cols, setCols] = useState<"month" | "week">("month");
  const wowList = (
    rows: CustomerSectionData["increase"] = [],
    color: string,
  ) => {
    const max = Math.max(0.0001, ...rows.map((r) => Math.abs(r.growth ?? 0)));
    return (
      <MiniTable
        head={[
          { label: "Tên Khách Cha" },
          { label: "So Sánh WoW %", width: "45%" },
        ]}
        rows={rows.map((r) => [
          <span key="k" className="line-clamp-1" title={r.key ?? ""}>
            {r.key ?? BLANK_LABEL}
          </span>,
          <BarCell
            key="b"
            width={(Math.abs(r.growth ?? 0) / max) * 100}
            text={pct(r.growth, 2)}
            color={color}
            minText={70}
          />,
        ])}
      />
    );
  };
  return (
    <div className="space-y-3">
      <Panel
        title="Tổng hợp doanh số theo khách hàng"
        subtitle="Vùng › Khách cha › Sản phẩm · Giá trị theo chỉ số đang chọn + tăng trưởng MoM"
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
          rows={DETAIL_PIVOT_REGION.rows}
          rowLabel="Vùng / Tên Khách Cha / Tên Sản Phẩm"
          cols={cols}
          growth={DETAIL_PIVOT_REGION.growth}
          heat
          measures={[
            { key: "metric", label: "Giá trị" },
            { key: "growth", label: "Tăng trưởng MoM (%)" },
          ]}
        />
      </Panel>
      <Panel
        title="Tổng hợp doanh số theo khách hàng (theo tuần)"
        subtitle="Khách cha › Sản phẩm · Doanh Số WoW %">
        <KdPivot
          filters={filters}
          rows={DETAIL_PIVOT_WEEK.rows}
          rowLabel="Tên Khách Cha / Tên Sản Phẩm"
          cols={DETAIL_PIVOT_WEEK.cols}
          growth={DETAIL_PIVOT_WEEK.growth}
          measures={[
            { key: "metric", label: "Giá trị" },
            { key: "growth", label: "Doanh Số WoW %" },
          ]}
        />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="10 KH key tăng mua"
          subtitle={
            data.week
              ? `${data.week.label} so với tuần trước · khách VIP Cty`
              : undefined
          }>
          {wowList(data.increase, "#27AE60")}
        </Panel>
        <Panel
          title="10 KH key giảm mua"
          subtitle={
            data.week
              ? `${data.week.label} so với tuần trước · khách VIP Cty`
              : undefined
          }>
          {wowList(data.decrease, "#EB5757")}
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Repeat Customer
// ─────────────────────────────────────────────────────────────────────────────
export function RepeatSection({ data }: { data: CustomerSectionData }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const monthsList = (data.months ?? []).map(String);
  const rateCols = [
    "revenue",
    "orders",
    "active",
    "newCustomers",
    "picTotal",
    "rate",
  ] as const;
  const rateLabels = [
    "Doanh Số",
    "Tổng Hóa Đơn",
    "Khách Mua Hàng",
    "Khách Mới",
    "Tổng Khách PIC",
    "% Khách Mua Lại",
  ];
  const cells = (c: Record<string, RepeatCell>, total: RepeatCell) =>
    [...monthsList, "__T"].map((mm) => {
      const x = mm === "__T" ? total : c[mm];
      return rateCols.map((k) => (
        <td
          key={`${mm}-${k}`}
          className="px-2 py-1 text-right dt-mono border-l whitespace-nowrap">
          {!x
            ? ""
            : k === "rate"
              ? x.rate === null
                ? ""
                : pct(x.rate, 2)
              : full(x[k])}
        </td>
      ));
    });
  const teams = [
    ...new Set((data.picByTeamRegion ?? []).map((r) => r.team ?? BLANK_LABEL)),
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Tỷ Lệ Khách Cũ Tái Mua Lại ( Trên Số Khách Sale Admin Phụ Trách)">
          <SimpleColumns
            rows={(data.byGroup ?? []).map((g) => ({
              name: g.key,
              value: g.rate ?? 0,
            }))}
            format={(v) => pct(v, 0)}
          />
        </Panel>
        <Panel title="Tỷ Lệ Khách Cũ Tái Mua Lại theo vùng">
          <SimpleColumns
            rows={(data.byGroupRegion ?? []).map((g) => ({
              name: `${g.group ?? ""} · ${g.region ?? BLANK_LABEL}`,
              value: g.rate ?? 0,
            }))}
            format={(v) => pct(v, 0)}
            color={DT_COLORS.primaryMid}
          />
        </Panel>
        <Panel
          title="Khách Hàng Sale Phụ Trách"
          subtitle="Số khách cha theo nhóm bán (khách) × vùng">
          <MiniTable
            head={[
              { label: "Nhóm Bán / Vùng" },
              { label: "Khách Phụ Trách", align: "right" },
            ]}
            rows={teams.flatMap((t) =>
              (data.picByTeamRegion ?? [])
                .filter((r) => (r.team ?? BLANK_LABEL) === t)
                .map((r) => [
                  `${t} · ${r.region ?? BLANK_LABEL}`,
                  int(r.value),
                ]),
            )}
          />
        </Panel>
      </div>

      <Panel
        title="Tổng Hợp Theo Khách Phân Bổ Cho Từng Sale Admin"
        subtitle="Nhóm khách › Vùng × Tháng">
        <div
          className="border rounded-lg overflow-auto max-h-[520px]"
          style={{ borderColor: "var(--dt-border)" }}>
          <table className="text-[12px] border-collapse min-w-full">
            <thead
              className="sticky top-0 z-10"
              style={{ background: "#F3F8F9" }}>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 px-2.5 py-2 text-left border-b"
                  style={{ background: "#F3F8F9" }}>
                  Nhóm Khách / Vùng
                </th>
                {[...monthsList, "Tổng"].map((mm) => (
                  <th
                    key={mm}
                    colSpan={6}
                    className="px-2 py-1.5 text-center border-b border-l">
                    {mm}
                  </th>
                ))}
              </tr>
              <tr>
                {[...monthsList, "__T"].map((mm) =>
                  rateLabels.map((l) => (
                    <th
                      key={`${mm}-${l}`}
                      className="px-2 py-1 text-right border-b border-l font-medium whitespace-nowrap">
                      {l}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {(data.pivot ?? []).map((r) => {
                const key = r.key ?? "__null";
                const tot = r.key === "__total__";
                return (
                  <Fragment key={key}>
                    <tr
                      className={`border-b ${tot ? "font-bold bg-[#F3F8F9]" : ""}`}>
                      <td className="sticky left-0 bg-white px-2.5 py-1 whitespace-nowrap">
                        {tot ? (
                          "Tổng"
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium"
                            onClick={() =>
                              setOpen((o) => ({ ...o, [key]: !o[key] }))
                            }>
                            {open[key] ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            {r.key ?? BLANK_LABEL}
                          </button>
                        )}
                      </td>
                      {cells(r.cells, r.total)}
                    </tr>
                    {open[key] &&
                      (r.children ?? []).map((ch) => (
                        <tr key={`${key}-${ch.key}`} className="border-b">
                          <td className="sticky left-0 bg-white px-2.5 py-1 pl-8 whitespace-nowrap">
                            {ch.key ?? BLANK_LABEL}
                          </td>
                          {cells(ch.cells, ch.total)}
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Danh Sách Khách Phân Bổ Cho Từng Sale Admin"
        subtitle={
          data.customerCount &&
          data.customerCount > (data.customers?.length ?? 0)
            ? `Hiện ${data.customers?.length} / ${data.customerCount} khách (sắp theo doanh số năm nay)`
            : undefined
        }>
        <AnalyticsTable
          columns={[
            { key: "code", label: "Mã Khách" },
            { key: "name", label: "Tên Khách" },
            { key: "parentName", label: "Tên Khách Cha" },
            { key: "group", label: "Nhóm Khách Hàng" },
            { key: "province", label: "Tỉnh Thành" },
            {
              key: "lastOrder",
              label: "Ngày Mua Hàng Gần Nhất",
              format: (v) => (v ? fmtDate(String(v)) : ""),
            },
            {
              key: "ytd",
              label: "Doanh Số Năm Nay",
              align: "right",
              format: (v) => (v === null ? "" : full(Number(v))),
            },
            {
              key: "lastMonth",
              label: "Doanh Số Tháng Trước",
              align: "right",
              format: (v) => (v === null ? "" : full(Number(v))),
            },
            {
              key: "currentMonth",
              label: "Doanh Số Tháng Này",
              align: "right",
              format: (v) => (v === null ? "" : full(Number(v))),
            },
            {
              key: "mom",
              label: "% Tăng Trưởng",
              align: "right",
              format: (v) => (v === null ? "" : pct(Number(v), 2)),
              color: (v) => pbiGrowthColor(v as number | null),
            },
          ]}
          rows={data.customers ?? []}
          rowKey={(r) => r.code}
          maxHeight={480}
        />
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demand
// ─────────────────────────────────────────────────────────────────────────────
export function DemandSection({ data }: { data: CustomerSectionData }) {
  const ms = (data.months ?? []).map(Number);
  const rows = data.rows ?? [];
  return (
    <Panel
      title="Theo Dõi Demand Maycha"
      subtitle={`Đang tính toán theo ${data.unit === "bulk" ? "Thùng" : "Gói"} · ${rows.length} sản phẩm · nguồn: nhu cầu khách (POS › Demand)`}>
      <div
        className="border rounded-lg overflow-auto max-h-[560px]"
        style={{ borderColor: "var(--dt-border)" }}>
        <table className="text-[12px] border-collapse min-w-full">
          <thead
            className="sticky top-0 z-10"
            style={{ background: "#F3F8F9" }}>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-20 px-2.5 py-2 text-left border-b"
                style={{ background: "#F3F8F9" }}>
                Tên Hàng
              </th>
              {ms.map((m) => (
                <th
                  key={m}
                  colSpan={3}
                  className="px-2 py-1.5 text-center border-b border-l">
                  Tháng {String(m).padStart(2, "0")}
                </th>
              ))}
            </tr>
            <tr>
              {ms.map((m) =>
                ["Demand", "Thực Tế", "+/ - Hàng"].map((l) => (
                  <th
                    key={`${m}-${l}`}
                    className="px-2 py-1 text-right border-b border-l font-medium whitespace-nowrap">
                    {l}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={1 + ms.length * 3}
                  className="p-6 text-center"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Không có dữ liệu demand trong kỳ
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.code} className="border-b">
                <td className="sticky left-0 bg-white px-2.5 py-1 whitespace-nowrap">
                  {r.name}
                </td>
                {ms.map((m) => {
                  const d = r.demand[m];
                  const a = r.actual[m];
                  const diff = (a ?? 0) - (d ?? 0);
                  const fmt = (v: number | undefined) =>
                    v === undefined
                      ? ""
                      : v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
                  return (
                    <Fragment key={m}>
                      <td className="px-2 py-1 text-right dt-mono border-l">
                        {fmt(d)}
                      </td>
                      <td className="px-2 py-1 text-right dt-mono">{fmt(a)}</td>
                      <td
                        className="px-2 py-1 text-right dt-mono"
                        style={{
                          color:
                            d === undefined && a === undefined
                              ? undefined
                              : diff < 0
                                ? "#EB5757"
                                : "#27AE60",
                        }}>
                        {d === undefined && a === undefined ? "" : fmt(diff)}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bảng chi tiết dòng hàng
// ─────────────────────────────────────────────────────────────────────────────
export function LineListingTable({
  title,
  data,
  withPrice = true,
}: {
  title: string;
  data?: LineListing;
  withPrice?: boolean;
}) {
  if (!data) return null;
  return (
    <Panel
      title={title}
      subtitle={
        data.truncated
          ? `Hiện ${data.rows.length} dòng mới nhất`
          : `${data.rows.length} dòng`
      }>
      <AnalyticsTable
        columns={[
          {
            key: "date",
            label: "Thời gian mua",
            format: (v) => fmtDate(String(v)),
          },
          { key: "invoiceCode", label: "Mã hóa đơn" },
          { key: "customerName", label: "Tên khách" },
          { key: "customerCode", label: "Mã khách" },
          { key: "productCode", label: "Mã hàng" },
          { key: "productName", label: "Tên hàng" },
          {
            key: "quantity",
            label: "Số lượng hàng",
            align: "right",
            format: (v) => full(Number(v)),
          },
          ...(withPrice
            ? [
                {
                  key: "price",
                  label: "Đơn giá",
                  align: "right" as const,
                  format: (v: unknown) => full(Number(v)),
                },
                {
                  key: "discount",
                  label: "Giảm giá",
                  align: "right" as const,
                  format: (v: unknown) => full(Number(v)),
                },
              ]
            : []),
          {
            key: "amount",
            label: "Tổng tiền hàng",
            align: "right",
            format: (v) => full(Number(v)),
          },
          ...(withPrice
            ? [
                {
                  key: "discount100",
                  label: "Giảm 100% hóa đơn",
                  format: (v: unknown) => (v ? "True" : "False"),
                },
                { key: "parentName", label: "Tên khách cha" },
              ]
            : []),
        ]}
        rows={data.rows}
        totals={{
          ...data.rows[0],
          date: "",
          invoiceCode: "Tổng",
          customerName: "",
          customerCode: "",
          productCode: "",
          productName: "",
          parentName: "",
          quantity: data.rows.reduce((s, r) => s + r.quantity, 0),
          amount: data.rows.reduce((s, r) => s + r.amount, 0),
          price: 0,
          discount: 0,
          discount100: false,
        }}
        rowKey={(r, i) => `${r.invoiceCode}-${r.productCode}-${i}`}
        maxHeight={460}
      />
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐLCL Lermao / Mứt Lermao
// ─────────────────────────────────────────────────────────────────────────────
export function LermaoSection({
  data,
  filters,
}: {
  data: CustomerSectionData;
  filters: KdFilters;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const mut = data.section === "mutLermao";
  const scoped = { ...filters, scope: data.scope };
  const d = data.dlcl;
  return (
    <div className="space-y-3">
      {d && (
        <Panel
          title="Tình Hình Mua Hàng Của ĐLCL"
          subtitle="Sản lượng hàng thương hiệu Lermao của từng khách ĐLCL (cột cấu hình được)">
          <div
            className="border rounded-lg overflow-auto max-h-[520px]"
            style={{ borderColor: "var(--dt-border)" }}>
            <table className="text-[12px] border-collapse min-w-full">
              <thead
                className="sticky top-0 z-10"
                style={{ background: "#F3F8F9" }}>
                <tr>
                  <th
                    className="sticky left-0 z-20 px-2.5 py-2 text-left border-b min-w-[240px]"
                    style={{ background: "#F3F8F9" }}>
                    Danh Mục / Tên Hàng
                  </th>
                  {d.columns.map((c) => (
                    <th
                      key={c}
                      className="px-2 py-2 text-right border-b border-l whitespace-nowrap">
                      {c === "__all__" ? "Tất Cả Khách" : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <Fragment key={r.category}>
                    <tr className="border-b font-medium">
                      <td className="sticky left-0 bg-white px-2.5 py-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() =>
                            setOpen((o) => ({
                              ...o,
                              [r.category]: !o[r.category],
                            }))
                          }>
                          {open[r.category] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          {r.category}
                        </button>
                      </td>
                      {d.columns.map((c) => (
                        <td
                          key={c}
                          className="px-2 py-1 text-right dt-mono border-l">
                          {r.values[c] ? full(r.values[c]) : ""}
                        </td>
                      ))}
                    </tr>
                    {open[r.category] &&
                      r.products.map((p) => (
                        <tr key={p.name} className="border-b">
                          <td
                            className="sticky left-0 bg-white px-2.5 py-1 pl-8 max-w-[360px] truncate"
                            title={p.name}>
                            {p.name}
                          </td>
                          {d.columns.map((c) => (
                            <td
                              key={c}
                              className="px-2 py-1 text-right dt-mono border-l">
                              {p.values[c] ? full(p.values[c]) : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot
                className="sticky bottom-0"
                style={{ background: "#F3F8F9" }}>
                <tr className="font-bold">
                  <td
                    className="sticky left-0 px-2.5 py-1.5"
                    style={{ background: "#F3F8F9" }}>
                    Tổng
                  </td>
                  {d.columns.map((c) => (
                    <td
                      key={c}
                      className="px-2 py-1.5 text-right dt-mono border-l">
                      {d.total[c] ? full(d.total[c]) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}
      <Panel
        title="Tổng Hợp Theo Khách Hàng"
        subtitle={`Khách ĐLCL ${mut ? "Mứt " : ""}Lermao › Sản phẩm`}>
        <KdPivot
          filters={scoped}
          rows={["parent_name", "product_name"]}
          rowLabel="Tên khách cha / Tên Hàng"
          growth="mom"
          detail
          measures={[
            { key: "amount", label: "Tổng Tiền Hàng" },
            { key: "orders", label: "Số Đơn Hàng" },
            { key: "quantity", label: "Số Lượng Hàng" },
            { key: "growth", label: "Tăng Trưởng MoM (%)" },
          ]}
        />
      </Panel>
      <Panel title="Tổng Hợp Theo Hàng Hóa" subtitle="Sản phẩm › Khách cha">
        <KdPivot
          filters={scoped}
          rows={["product_name", "parent_name"]}
          rowLabel="Tên Hàng / Tên khách cha"
          growth="mom"
          detail
          measures={[
            { key: "amount", label: "Tổng tiền hàng" },
            { key: "quantity", label: "Số lượng hàng" },
            { key: "growth", label: "Tăng trưởng MoM (%)" },
          ]}
        />
      </Panel>
      {mut && (
        <LineListingTable
          title="Báo cáo chi tiết doanh số sản phẩm Mứt Lermao của các khách hàng chiến lược"
          data={data.lines}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐLCL Boduo / Phượng Hoàng
// ─────────────────────────────────────────────────────────────────────────────
export function BrandKeySection({
  data,
  filters,
  axisSeg,
}: {
  data: CustomerSectionData;
  filters: KdFilters;
  axisSeg: React.ReactNode;
}) {
  const metric = (data.metric ?? "amount") as AnalyticsMetric;
  const scoped = { ...filters, scope: data.scope };
  if (data.section === "boduo")
    return (
      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
          <Panel
            title="Doanh số sản phẩm BODUO của các khách hàng KEY được chiết khấu"
            subtitle="Theo tháng">
            <CurPrevLineChart
              rows={(data.byMonth ?? []).map((r) => ({
                label: String(r.key),
                current: r.value,
              }))}
              metric={metric}
              curLabel="Giá trị"
            />
          </Panel>
          <Panel title="Doanh số sản phẩm BODUO theo danh mục">
            <DonutChart rows={kv(data.byCategory)} metric={metric} />
          </Panel>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Tình hình kinh doanh sản phẩm BODUO của các khách hàng KEY được chiết khấu">
            <KdPivot
              filters={scoped}
              rows={["customer_name"]}
              rowLabel="Tên khách"
              growth="mom"
              measures={[
                { key: "metric", label: "Giá trị" },
                { key: "growth", label: "Tăng trưởng (%)" },
              ]}
            />
          </Panel>
          <Panel title="Danh Mục Hàng Boduo">
            <KdPivot
              filters={scoped}
              rows={["category"]}
              rowLabel="Danh Mục Hàng"
              growth="mom"
              measures={[
                { key: "metric", label: "Giá trị" },
                { key: "growth", label: "Tăng Trưởng (%)" },
              ]}
            />
          </Panel>
        </div>
        <LineListingTable
          title="Báo cáo chi tiết doanh số sản phẩm BODUO của các khách hàng KEY được chiết khấu"
          data={data.lines}
          withPrice={false}
        />
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Top 5 sản phẩm bán chạy của KH Ưu tiên Phượng Hoàng">
          <HBarChart rows={kv(data.topProducts)} metric={metric} color={C.ok} />
        </Panel>
        <Panel
          title="Xu hướng doanh số KH Ưu tiên Phượng Hoàng"
          right={axisSeg}>
          <CurPrevLineChart
            rows={(data.trend ?? []).map((t) => ({
              label: t.label,
              current: t.value ?? 0,
            }))}
            metric={metric}
            curLabel="Giá trị"
          />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_2fr]">
        <Panel title="Các sản phẩm đã bán được cho KH Ưu tiên">
          <KdPivot
            filters={scoped}
            rows={["product_name", "parent_name"]}
            rowLabel="Tên hàng / Tên Khách Cha"
            cols="none"
            detail
            measures={[{ key: "quantity", label: "Số lượng hàng" }]}
          />
        </Panel>
        <Panel title="Tình hình kinh doanh của KH Ưu tiên Phượng Hoàng">
          <KdPivot
            filters={scoped}
            rows={["parent_name", "product_name"]}
            rowLabel="Tên Khách Cha / Tên Hàng Hóa"
            growth="mom"
            measures={[
              { key: "metric", label: "Giá trị" },
              { key: "growth", label: "Tăng trưởng (%)" },
            ]}
          />
        </Panel>
      </div>
      <LineListingTable
        title="Báo cáo chi tiết doanh số sản phẩm KH Ưu tiên Phượng Hoàng"
        data={data.lines}
      />
    </div>
  );
}
