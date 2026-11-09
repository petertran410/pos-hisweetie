"use client";

import { Landmark } from "lucide-react";
import type {
  PeriodicDetail,
  WeekCompareRow,
} from "@/lib/api/analytics-kinh-doanh";
import { AnalyticsTable, type AnalyticsColumn } from "../shared/AnalyticsTable";
import { Panel } from "../shared/AnalyticsCharts";
import { fmtRange, full, pct, rateColor, ty } from "./kdFormat";

const num = (v: unknown) =>
  v === null || v === undefined ? "" : full(Number(v));
const rate = (v: unknown) =>
  v === null || v === undefined ? "" : pct(Number(v), 2);

/** BC Định Kì › Chi Tiết: các pivot Power BI (nhóm hàng × tuần, O1, O2, O3, nhân sự, nợ). */
export function PeriodicDetailView({ data }: { data: PeriodicDetail }) {
  const tw = fmtRange(data.ranges.thisWeek);
  const lw = fmtRange(data.ranges.lastWeek);

  // Bảng kế hoạch tuần (O1 / O2)
  const planCols = (
    first: string,
  ): AnalyticsColumn<WeekCompareRow & { key: string | null }>[] => [
    { key: "key", label: first, format: (v) => String(v ?? "") },
    { key: "plan", label: "Kế Hoạch Tuần", align: "right", format: num },
    {
      key: "thisWeek",
      label: "Doanh Thu Tuần Này",
      align: "right",
      format: num,
    },
    {
      key: "rateThisWeek",
      label: "Thực Đạt Tuần Này",
      align: "right",
      format: rate,
      color: (v) => (v === null ? undefined : rateColor(Number(v))),
    },
    {
      key: "lastWeek",
      label: "Doanh Thu Tuần Trước",
      align: "right",
      format: num,
    },
    {
      key: "rateLastWeek",
      label: "Thực Đạt Tuần Trước",
      align: "right",
      format: rate,
      color: (v) => (v === null ? undefined : rateColor(Number(v))),
    },
  ];
  // Dòng tổng: KPI_target_* dùng SELECTEDVALUE nên ở dòng tổng để trống (giống Power BI).
  const planTotal = (rows: WeekCompareRow[]): WeekCompareRow => {
    const t = rows.reduce((s, r) => s + r.thisWeek, 0);
    const l = rows.reduce((s, r) => s + r.lastWeek, 0);
    return {
      key: "Tổng",
      plan: null,
      thisWeek: t,
      lastWeek: l,
      rateThisWeek: null,
      rateLastWeek: null,
    };
  };

  const weekCols: AnalyticsColumn<{
    group: string;
    values: Record<string, number>;
  }>[] = [
    { key: "group", label: "Nhóm Hàng" },
    ...data.weekly.columns.map((c) => ({
      key: c.key,
      label: c.label,
      align: "right" as const,
      value: (r: { values: Record<string, number> }) => r.values[c.key],
      format: num,
    })),
    {
      key: "__total",
      label: "Tổng",
      align: "right",
      value: (r) => Object.values(r.values).reduce((s, v) => s + v, 0),
      format: num,
    },
  ];
  const weekTotal = {
    group: "Tổng",
    values: data.weekly.total,
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_3fr]">
        <div className="dt-panel p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Landmark className="w-4 h-4" style={{ color: "#C0392B" }} />
            Nợ Hiện Tại
          </div>
          <div className="text-[26px] font-bold mt-1">
            {ty(data.debt.value)}
          </div>
          <div
            className="text-[12px] mt-1"
            style={{ color: "var(--dt-text-muted)" }}>
            {data.debt.rate === null
              ? "Chưa có chỉ tiêu năm"
              : `Đã đạt được ${pct(data.debt.rate, 2)} mục tiêu năm`}
          </div>
        </div>
        <Panel
          title="Kết quả doanh số theo từng nhóm hàng theo tuần"
          subtitle="Doanh số (cấp dòng hàng) theo tuần của kỳ đang lọc">
          <AnalyticsTable
            columns={weekCols}
            rows={data.weekly.rows}
            totals={weekTotal}
            rowKey={(r) => r.group}
            maxHeight={360}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="O1: Doanh thu theo nhóm hàng"
          subtitle={`Tuần này ${tw} · Tuần trước ${lw} · Kế hoạch tuần = KPI tháng ÷ 4`}>
          <AnalyticsTable
            columns={planCols("Nhóm hàng")}
            rows={data.o1}
            totals={planTotal(data.o1)}
            rowKey={(r) => String(r.key)}
          />
        </Panel>
        <Panel
          title="O2: Doanh thu theo nhóm hàng hóa"
          subtitle="Thực đạt tuần trước so với KPI tháng trước ÷ 4">
          <AnalyticsTable
            columns={planCols("Nhóm Hàng")}
            rows={data.o2}
            totals={planTotal(data.o2)}
            rowKey={(r) => String(r.key)}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
        <Panel
          title="Hiệu quả nhân sự"
          subtitle={`Tuần này ${tw} · Tuần trước ${lw}`}>
          <AnalyticsTable
            columns={[
              {
                key: "key",
                label: "Nhân Viên Bán Hàng",
                format: (v) => String(v ?? "(Trống)"),
              },
              {
                key: "thisWeek",
                label: "Doanh Số Tuần Này",
                align: "right",
                format: num,
              },
              {
                key: "lastWeek",
                label: "Doanh Số Tuần Trước",
                align: "right",
                format: num,
              },
            ]}
            rows={data.staff}
            totals={{ key: "Tổng", ...data.totals }}
            rowKey={(r) => String(r.key)}
          />
        </Panel>
        <Panel title="O3: Doanh số khu vực trọng điểm">
          <AnalyticsTable
            columns={[
              { key: "key", label: "Miền", format: (v) => String(v ?? "") },
              {
                key: "thisWeek",
                label: "Doanh Thu Tuần Này",
                align: "right",
                format: num,
              },
              {
                key: "lastWeek",
                label: "Doanh Thu Tuần Trước",
                align: "right",
                format: num,
              },
            ]}
            rows={data.central}
            rowKey={(r) => String(r.key)}
          />
        </Panel>
      </div>
    </div>
  );
}
