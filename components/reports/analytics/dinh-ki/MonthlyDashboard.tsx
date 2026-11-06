"use client";

import { useState } from "react";
import { useDinhKiMonthly } from "@/lib/hooks/useAnalyticsDinhKi";
import {
  DkDebtBlock,
  DkGroupTable,
  DkTeamTable,
  DkTopProductsBlock,
  DkVisualTable,
} from "./DkCommonBlocks";
import {
  DkAnchorNav,
  DkLoading,
  DkSection,
  DkStat,
  DkUpdated,
  monthLabel,
} from "./DkUi";
import {
  DK,
  change,
  fmtDate,
  fmtMonth,
  fmtNum,
  fmtPct,
  fmtTr,
  fmtTy,
  kpiTone,
  trend,
} from "./dkFormat";

/** Định Kì › Tháng (html_monthly): báo cáo điều hành Sale theo tháng. */
export function MonthlyDashboard() {
  const [date, setDate] = useState<string | undefined>();
  const { data, error, isLoading, isFetching } = useDinhKiMonthly(date);

  const header = (
    <div className="dt-panel px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[240px]">
        <h2 className="text-[16px] font-bold">
          Báo cáo điều hành Sale - Tháng{" "}
          {data ? fmtMonth(data.ranges.cur.from) : ""}
        </h2>
        {data && (
          <div
            className="text-[12px]"
            style={{ color: "var(--dt-text-muted)" }}>
            {fmtDate(data.ranges.cur.from)} – {fmtDate(data.ranges.cur.to)} · So
            sánh tháng {fmtMonth(data.ranges.prev.from)}
          </div>
        )}
      </div>
      <DkAnchorNav
        unit="month"
        value={date}
        resolved={data?.anchor}
        today={data?.today}
        onChange={setDate}
        loading={isFetching}
        label={data ? monthLabel(data.ranges.cur.from) : "…"}
      />
    </div>
  );
  if (error || isLoading || !data)
    return (
      <>
        {header}
        <DkLoading error={error} />
      </>
    );

  const f = data.finance;
  const revG = change(f.revenue.current, f.revenue.previous);
  const ordG = change(f.orders.current, f.orders.previous);
  const newG = change(f.newCustomers.current, f.newCustomers.previous);
  const c = data.customers;
  const revNewUp = c.revenueNewCurrent >= c.revenueNewPrevious;

  return (
    <>
      {header}
      <div className="grid gap-3 grid-cols-1 xl:grid-cols-[1.35fr_1fr] items-start">
        <DkSection badge="● TÀI CHÍNH - DOANH THU">
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <DkStat
              label="Tổng doanh thu tháng"
              value={fmtTy(f.revenue.current, 1)}
              subColor={trend(revG).color}
              sub={`${trend(revG).arrow} ${fmtPct(revG)} vs tháng trước (${fmtTy(f.revenue.previous, 1)})`}
            />
            <DkStat
              label="Đơn hàng tháng"
              value={fmtNum(f.orders.current)}
              subColor={trend(ordG).color}
              sub={`${trend(ordG).arrow} ${fmtPct(ordG)} (${fmtNum(f.orders.previous)})`}
            />
            <DkStat
              label="% KPI Sale tháng"
              value={fmtPct(f.kpi.pct, 0)}
              valueColor={kpiTone(f.kpi.pct).fg}
              sub={`${fmtTy(f.kpi.actual, 1)} / ${fmtTy(f.kpi.target, 1)}`}
            />
            <DkStat
              label="Khách hàng mới tháng"
              value={fmtNum(f.newCustomers.current)}
              subColor={trend(newG).color}
              sub={`${trend(newG).arrow} ${fmtPct(newG)} (${fmtNum(f.newCustomers.previous)})`}
            />
          </div>
          <DkGroupTable
            rows={data.groups}
            actualLabel="Thực đạt tháng (bar = % KPI)"
            growthLabel="MoM"
          />
          <DkVisualTable
            rows={data.visualGroups}
            actualLabel="Thực đạt (bar = tỷ trọng)"
            growthLabel="MoM"
          />
        </DkSection>

        <div className="space-y-3 min-w-0">
          <DkDebtBlock debt={data.debt} />
          <DkSection badge="● KHÁCH HÀNG" color={DK.good} bg={DK.goodBg}>
            <DkStat
              label="Doanh số KH mới tháng"
              value={fmtTr(c.revenueNewCurrent)}
              subColor={revNewUp ? DK.good : DK.bad}
              sub={`${revNewUp ? "▲" : "▼"} (${fmtTr(c.revenueNewPrevious)} tháng trước)`}
            />
          </DkSection>
          <DkTeamTable
            rows={data.teams}
            revenueLabel="Doanh số (bar = % KPI)"
            showNew
          />
          <DkTopProductsBlock
            lermao={data.topProducts.lermao}
            phuongHoang={data.topProducts.phuongHoang}
          />
        </div>
      </div>
      <DkUpdated at={data.updatedAt} />
    </>
  );
}
