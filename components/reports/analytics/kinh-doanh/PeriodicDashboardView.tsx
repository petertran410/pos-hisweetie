"use client";

import type { PeriodicDashboard } from "@/lib/api/analytics-kinh-doanh";
import {
  C,
  arrow,
  fmtRange,
  growthColor,
  int,
  pct,
  rateBg,
  rateColor,
  tr,
  ty,
} from "./kdFormat";
import {
  BarCell,
  Block,
  MiniTable,
  Pill,
  SectionTitle,
  StatCard,
} from "./KdUi";

/**
 * Báo cáo điều hành Sale Tuần / Tuần trước / Tháng — dựng lại các measure
 * html_weekly, html_last_week, html_monthly (BSC 4 góc nhìn).
 */
export function PeriodicDashboardView({ data }: { data: PeriodicDashboard }) {
  const isMonth = data.view === "month";
  const unit = isMonth ? "tháng" : "tuần";
  const cmp = isMonth ? "MoM" : "WoW";
  const prevLabel = isMonth ? "tháng trước" : "tuần trước";
  const title =
    data.view === "week"
      ? "Báo cáo điều hành Sale - Tuần"
      : data.view === "lastWeek"
        ? "Báo cáo điều hành Sale - Tuần trước"
        : "Báo cáo điều hành Sale - Tháng";
  const f = data.finance;
  const cus = data.customers;
  const newGrowth = cus.newPrevious
    ? (cus.newCurrent - cus.newPrevious) / cus.newPrevious
    : null;

  const growthText = (g: number | null) => (
    <b style={{ color: growthColor(g) }}>
      {arrow(g)} {pct(g === null ? null : Math.abs(g))}
    </b>
  );

  const topTable = (
    rows: { name: string; quantity: number; amount: number }[],
    color: string,
  ) => {
    const max = Math.max(1, ...rows.map((r) => r.quantity));
    return (
      <MiniTable
        head={[
          { label: "Sản phẩm" },
          { label: "Sản lượng", align: "right", width: "40%" },
          { label: "DT", align: "right", width: "70px" },
        ]}
        rows={rows.map((r) => [
          <span key="n" className="line-clamp-1" title={r.name}>
            {r.name}
          </span>,
          <BarCell
            key="q"
            width={(r.quantity / max) * 100}
            text={int(r.quantity)}
            color={color}
            minText={50}
          />,
          tr(r.amount),
        ])}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5"
        style={{ borderColor: C.line }}>
        <div className="text-[17px] font-semibold">{title}</div>
        <div className="text-[12px]" style={{ color: C.muted }}>
          Kỳ: {fmtRange(data.current)} · So với: {fmtRange(data.previous)}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* Cột trái */}
        <div className="space-y-3 min-w-0">
          <SectionTitle>Tài chính - Doanh thu</SectionTitle>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`Tổng doanh thu ${unit}`}
              value={ty(f.revenue.current, 1)}
              sub={
                <>
                  {growthText(f.revenue.growth)} vs {prevLabel} (
                  {ty(f.revenue.previous, 1)})
                </>
              }
            />
            <StatCard
              label={`Đơn hàng ${unit}`}
              value={int(f.orders.current)}
              sub={
                <>
                  {growthText(f.orders.growth)} ({int(f.orders.previous)})
                </>
              }
            />
            <StatCard
              label={`% KPI Sale ${unit}`}
              value={pct(f.kpi.rate, 0)}
              color={rateColor(f.kpi.rate)}
              sub={
                <>
                  {ty(f.kpi.actual, 1)} /{" "}
                  {f.kpi.target === null ? "—" : ty(f.kpi.target, 1)}
                </>
              }
            />
            {isMonth ? (
              <StatCard
                label="Khách hàng mới tháng"
                value={int(cus.newCurrent)}
                sub={
                  <>
                    {growthText(newGrowth)} ({int(cus.newPrevious)})
                  </>
                }
              />
            ) : (
              <StatCard
                label="Doanh số miền Trung"
                value={ty(f.central.current, 2)}
                sub={
                  <>
                    {growthText(
                      f.central.previous
                        ? (f.central.current - f.central.previous) /
                            f.central.previous
                        : null,
                    )}{" "}
                    ({ty(f.central.previous, 2)})
                  </>
                }
              />
            )}
          </div>

          <Block title="O1 - Doanh thu theo nhóm hàng">
            <MiniTable
              head={[
                { label: "Nhóm hàng", width: "18%" },
                { label: `Thực đạt ${unit} (bar = % KPI)` },
                { label: "Kế hoạch", align: "right" },
                { label: "% Đạt", align: "right" },
                { label: cmp, align: "right" },
              ]}
              rows={data.groups.map((g) => [
                <b key="k">{g.key}</b>,
                <BarCell
                  key="b"
                  width={(g.rate ?? 0) * 100}
                  text={ty(g.actual, 2)}
                />,
                g.plan === null ? "—" : ty(g.plan, 2),
                <Pill key="p" color={rateColor(g.rate)} bg={rateBg(g.rate)}>
                  {pct(g.rate, 0)}
                </Pill>,
                <span key="g" style={{ color: growthColor(g.growth) }}>
                  {arrow(g.growth)} {pct(g.growth)}
                </span>,
              ])}
            />
          </Block>

          <Block title="O2 - Doanh thu theo nhóm hàng hóa (Brand)">
            <MiniTable
              head={[
                { label: "Hạng mục", width: "18%" },
                { label: "Thực đạt (bar = tỷ trọng)" },
                { label: "Tỷ trọng", align: "right" },
                { label: cmp, align: "right" },
              ]}
              rows={data.visual.map((g) => [
                <b key="k">{g.key}</b>,
                <BarCell
                  key="b"
                  width={(g.share ?? 0) * 100}
                  text={ty(g.actual, 2)}
                  color={C.accent}
                />,
                pct(g.share),
                <span key="g" style={{ color: growthColor(g.growth) }}>
                  {arrow(g.growth)} {pct(g.growth)}
                </span>,
              ])}
            />
          </Block>
        </div>

        {/* Cột phải */}
        <div className="space-y-3 min-w-0">
          <SectionTitle>Tối ưu chi phí</SectionTitle>
          <div className="grid gap-2 grid-cols-2">
            <StatCard
              label="Công nợ khách hàng (cuối kỳ)"
              value={ty(data.debt.total, 1)}
              color={C.warn}
            />
            <StatCard
              label="KH nợ quá 30 ngày"
              value={int(data.debt.over30)}
              color={C.warn}
            />
          </div>

          <SectionTitle>Khách hàng</SectionTitle>
          <div className="grid gap-2 grid-cols-2">
            <StatCard
              label={isMonth ? "Khách hàng mới tháng" : "KR1 - Khách hàng mới"}
              value={int(cus.newCurrent)}
              color={cus.newCurrent >= cus.newPrevious ? C.ok : C.warn}
              sub={
                <>
                  {cus.newCurrent >= cus.newPrevious ? "▲" : "▼"} vs {prevLabel}{" "}
                  ({int(cus.newPrevious)})
                </>
              }
            />
            <StatCard
              label={
                isMonth ? "Doanh số KH mới tháng" : "KR3 - Doanh số KH mới"
              }
              value={tr(cus.newAmountCurrent, 1)}
              color={
                cus.newAmountCurrent >= cus.newAmountPrevious ? C.ok : C.warn
              }
              sub={
                <>
                  {cus.newAmountCurrent >= cus.newAmountPrevious ? "▲" : "▼"} vs{" "}
                  {prevLabel} ({tr(cus.newAmountPrevious, 1)})
                </>
              }
            />
          </div>

          <SectionTitle>Hiệu quả nhân sự</SectionTitle>
          <Block>
            <MiniTable
              head={[
                { label: "Team Sale", width: "22%" },
                { label: "Doanh số (bar = % KPI)" },
                { label: "Đơn", align: "right" },
                { label: "KH mới", align: "right" },
                { label: "% KPI", align: "right" },
              ]}
              rows={data.teams.map((t) => [
                <b key="t">{t.team}</b>,
                <BarCell
                  key="b"
                  width={(t.rate ?? 0) * 100}
                  text={ty(t.revenue, 2)}
                />,
                int(t.orders),
                int(t.newCustomers),
                <Pill key="p" color={rateColor(t.rate)} bg={rateBg(t.rate)}>
                  {pct(t.rate, 0)}
                </Pill>,
              ])}
            />
          </Block>

          <div className="grid gap-3 lg:grid-cols-2">
            <Block title="★ Top 5 Lermao (SL)">
              {topTable(data.topLermao, C.accent)}
            </Block>
            <Block title="★ Top 5 Phượng Hoàng (SL)">
              {topTable(data.topPhuongHoang, C.ok)}
            </Block>
          </div>
        </div>
      </div>
      <div className="text-[11.5px] text-right" style={{ color: C.muted }}>
        Cập nhật {new Date(data.updatedAt).toLocaleString("vi-VN")} · % KPI ={" "}
        doanh số / (KPI tháng{isMonth ? "" : " ÷ 4"}) · Khách mới = lần mua đầu
        tiên rơi vào kỳ
      </div>
    </div>
  );
}
