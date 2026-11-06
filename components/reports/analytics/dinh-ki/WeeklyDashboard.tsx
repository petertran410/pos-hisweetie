"use client";

import { useState } from "react";
import { useDinhKiWeekly } from "@/lib/hooks/useAnalyticsDinhKi";
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
  weekLabel,
} from "./DkUi";
import {
  DK,
  change,
  fmtDate,
  fmtDm,
  fmtNum,
  fmtPct,
  fmtTr,
  fmtTy,
  kpiTone,
  trend,
} from "./dkFormat";

/**
 * Định Kì › Tuần Này (html_weekly) và Tuần Trước (html_last_week):
 * báo cáo điều hành Sale theo tuần — tài chính, nhóm hàng, chi phí, khách hàng,
 * hiệu quả nhân sự, top sản phẩm.
 */
export function WeeklyDashboard({ mode }: { mode: "this" | "last" }) {
  const [date, setDate] = useState<string | undefined>();
  const { data, error, isLoading, isFetching } = useDinhKiWeekly(mode, date);
  const last = mode === "last";

  const nav = (
    <DkAnchorNav
      unit="week"
      value={date}
      resolved={data?.anchor}
      today={data?.today}
      onChange={setDate}
      loading={isFetching}
      label={
        data
          ? `Tuần ${weekLabel(data.ranges.cur0.from, data.ranges.cur0.to)}`
          : "…"
      }
    />
  );

  if (error || isLoading || !data)
    return (
      <>
        <div className="dt-panel px-4 py-3 flex flex-wrap items-center gap-3">
          <h2 className="text-[16px] font-bold flex-1">
            Báo cáo điều hành Sale - {last ? "Tuần trước" : "Tuần"}
          </h2>
          {nav}
        </div>
        <DkLoading error={error} />
      </>
    );

  const f = data.finance;
  const revG = change(f.revenue.current, f.revenue.previous);
  const ordG = change(f.orders.current, f.orders.previous);
  const cenG = change(f.central.current, f.central.previous);
  const c = data.customers;
  const newUp = c.newCurrent >= c.newPrevious;
  const revNewUp = c.revenueNewCurrent >= c.revenueNewPrevious;
  const vs = last ? "vs W-2" : "vs tuần trước";
  const { cur0, prev } = data.ranges;

  return (
    <>
      <div className="dt-panel px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-[16px] font-bold">
            Báo cáo điều hành Sale -{" "}
            {last
              ? `Tuần trước (${fmtDm(cur0.from)} - ${fmtDate(cur0.to)})`
              : "Tuần"}
          </h2>
          <div
            className="text-[12px]"
            style={{ color: "var(--dt-text-muted)" }}>
            {last
              ? `So sánh tuần ${fmtDm(prev.from)} - ${fmtDate(prev.to)} · `
              : ""}
            Ngày mốc: {fmtDate(data.anchor)} · KPI tháng{" "}
            {String(data.kpiMonth.month).padStart(2, "0")}/{data.kpiMonth.year}
          </div>
        </div>
        {nav}
      </div>

      <div className="grid gap-3 grid-cols-1 xl:grid-cols-[1.35fr_1fr] items-start">
        <DkSection badge="● TÀI CHÍNH - DOANH THU">
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <DkStat
              label={
                last ? "Tổng doanh thu (tuần trước)" : "Tổng doanh thu tuần"
              }
              value={fmtTy(f.revenue.current, 1)}
              subColor={trend(revG).color}
              sub={`${trend(revG).arrow} ${fmtPct(revG)} ${vs} (${fmtTy(f.revenue.previous, 1)})`}
            />
            <DkStat
              label={last ? "Đơn hàng (tuần trước)" : "Đơn hàng tuần"}
              value={fmtNum(f.orders.current)}
              subColor={trend(ordG).color}
              sub={`${trend(ordG).arrow} ${fmtPct(ordG)} (${fmtNum(f.orders.previous)})`}
            />
            <DkStat
              label={last ? "% KPI Sale (tuần trước)" : "% KPI Sale tuần"}
              value={fmtPct(f.kpi.pct, 0)}
              valueColor={kpiTone(f.kpi.pct).fg}
              sub={`Mục tiêu: ${fmtTy(f.kpi.target, 1)}`}
            />
            <DkStat
              label="Doanh số miền Trung"
              value={fmtTy(f.central.current, 2)}
              subColor={trend(cenG).color}
              sub={`${trend(cenG).arrow} ${fmtPct(cenG)} (${fmtTy(f.central.previous, 2)})`}
            />
          </div>
          <DkGroupTable
            rows={data.groups}
            actualLabel={
              last
                ? "Thực đạt W-1 (bar = % KPI)"
                : "Thực đạt tuần (bar = % KPI)"
            }
            growthLabel="WoW"
          />
          <DkVisualTable
            rows={data.visualGroups}
            actualLabel={
              last
                ? "Thực đạt W-1 (bar = tỷ trọng)"
                : "Thực đạt (bar = tỷ trọng)"
            }
            growthLabel="WoW"
          />
        </DkSection>

        <div className="space-y-3 min-w-0">
          <DkDebtBlock debt={data.debt} />
          <DkSection badge="● KHÁCH HÀNG" color={DK.good} bg={DK.goodBg}>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              <DkStat
                label={`KR1 - Khách hàng mới${last ? " (W-1)" : ""}`}
                value={fmtNum(c.newCurrent)}
                subColor={newUp ? DK.good : DK.bad}
                sub={`${newUp ? "▲" : "▼"} ${vs}: ${fmtNum(c.newPrevious)}`}
              />
              <DkStat
                label={`KR3 - Doanh số KH mới${last ? " (W-1)" : ""}`}
                value={fmtTr(c.revenueNewCurrent)}
                subColor={revNewUp ? DK.good : DK.bad}
                sub={`${revNewUp ? "▲" : "▼"} (${fmtTr(c.revenueNewPrevious)})`}
              />
            </div>
          </DkSection>
          <DkTeamTable
            rows={data.teams}
            revenueLabel={
              last ? "Doanh số W-1 (bar = % KPI)" : "Doanh số (bar = % KPI)"
            }
            showNew={!last}
          />
          {data.topProducts && (
            <DkTopProductsBlock
              lermao={data.topProducts.lermao}
              phuongHoang={data.topProducts.phuongHoang}
            />
          )}
        </div>
      </div>
      <DkUpdated at={data.updatedAt} />
    </>
  );
}
