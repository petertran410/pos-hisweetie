"use client";

// Các khối dùng chung của trang Tuần Này / Tuần Trước / Tháng (html_weekly,
// html_last_week, html_monthly): bảng O1, O2, công nợ, đội sale, top sản phẩm.

import type {
  DkDebt,
  DkGroupRow,
  DkTeamRow,
  DkTopProduct,
  DkVisualRow,
} from "@/lib/api/analytics-dinh-ki";
import {
  DkBar,
  DkDelta,
  DkPill,
  DkSection,
  DkStat,
  DkTable,
  DkTd,
} from "./DkUi";
import { DK, change, fmtNum, fmtPct, fmtTr, fmtTy } from "./dkFormat";

/** O1 - Doanh thu theo nhóm hàng (nhóm hàng 2026), thanh = % KPI. */
export function DkGroupTable({
  rows,
  actualLabel,
  growthLabel,
}: {
  rows: DkGroupRow[];
  actualLabel: string;
  growthLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-semibold">
        O1 - Doanh thu theo nhóm hàng
      </div>
      <DkTable
        empty={!rows.length}
        head={[
          { label: "Nhóm hàng", width: "22%" },
          { label: actualLabel },
          { label: "Kế hoạch", align: "right", width: "14%" },
          { label: "% Đạt", align: "right", width: "10%" },
          { label: growthLabel, align: "right", width: "12%" },
        ]}>
        {rows.map((r) => (
          <tr key={r.name}>
            <DkTd>{r.name}</DkTd>
            <DkTd>
              <DkBar ratio={r.pct} label={fmtTy(r.revenue, 2)} />
            </DkTd>
            <DkTd align="right" mono>
              {fmtTy(r.target, 2)}
            </DkTd>
            <DkTd align="right">
              <DkPill value={r.pct} />
            </DkTd>
            <DkTd align="right">
              <DkDelta value={change(r.revenue, r.previous)} />
            </DkTd>
          </tr>
        ))}
      </DkTable>
    </div>
  );
}

/** O2 - Doanh thu theo nhóm hàng hoá (Brand), thanh = tỷ trọng. */
export function DkVisualTable({
  rows,
  actualLabel,
  growthLabel,
}: {
  rows: DkVisualRow[];
  actualLabel: string;
  growthLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-semibold">
        O2 - Doanh thu theo nhóm hàng hóa (Brand)
      </div>
      <DkTable
        empty={!rows.length}
        head={[
          { label: "Hạng mục", width: "22%" },
          { label: actualLabel },
          { label: "Tỷ trọng", align: "right", width: "14%" },
          { label: growthLabel, align: "right", width: "12%" },
        ]}>
        {rows.map((r) => (
          <tr key={r.name}>
            <DkTd>{r.name}</DkTd>
            <DkTd>
              <DkBar ratio={r.share} label={fmtTy(r.revenue, 2)} />
            </DkTd>
            <DkTd align="right" mono>
              {fmtPct(r.share)}
            </DkTd>
            <DkTd align="right">
              <DkDelta value={change(r.revenue, r.previous)} />
            </DkTd>
          </tr>
        ))}
      </DkTable>
    </div>
  );
}

/** ● TỐI ƯU CHI PHÍ — công nợ cuối kỳ + KH nợ quá 30 ngày. */
export function DkDebtBlock({ debt }: { debt: DkDebt }) {
  return (
    <DkSection badge="● TỐI ƯU CHI PHÍ" color="#A35A0B" bg={DK.warnBg}>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <DkStat
          label="Công nợ khách hàng (cuối kỳ)"
          value={fmtTy(debt.total, 1)}
          sub="Số dư hiện tại"
        />
        <DkStat
          label="KH nợ quá 30 ngày"
          value={`${fmtNum(debt.over30)} KH`}
          sub="chưa thanh toán & quá 30 ngày từ lần mua cuối"
        />
      </div>
    </DkSection>
  );
}

/** ● HIỆU QUẢ NHÂN SỰ — theo team sale, thanh = % KPI. */
export function DkTeamTable({
  rows,
  revenueLabel,
  showNew,
}: {
  rows: DkTeamRow[];
  revenueLabel: string;
  showNew: boolean;
}) {
  return (
    <DkSection badge="● HIỆU QUẢ NHÂN SỰ" color="#3C3489" bg="#EEEDFE">
      <DkTable
        empty={!rows.length}
        head={[
          { label: "Team Sale", width: "24%" },
          { label: revenueLabel },
          { label: "Đơn", align: "right", width: "11%" },
          ...(showNew
            ? [{ label: "KH mới", align: "right" as const, width: "11%" }]
            : []),
          { label: "% KPI", align: "right", width: "11%" },
        ]}>
        {rows.map((t) => (
          <tr key={t.id}>
            <DkTd>{t.name}</DkTd>
            <DkTd>
              <DkBar ratio={t.kpiPct} label={fmtTy(t.revenue, 2)} />
            </DkTd>
            <DkTd align="right" mono>
              {fmtNum(t.orders)}
            </DkTd>
            {showNew && (
              <DkTd align="right" mono>
                {fmtNum(t.newCustomers)}
              </DkTd>
            )}
            <DkTd align="right">
              <DkPill value={t.kpiPct} />
            </DkTd>
          </tr>
        ))}
      </DkTable>
    </DkSection>
  );
}

function TopTable({
  title,
  rows,
  color,
  bg,
}: {
  title: string;
  rows: DkTopProduct[];
  color: string;
  bg: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.quantity));
  return (
    <div className="space-y-1.5 min-w-0">
      <span
        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md"
        style={{ background: bg, color }}>
        {title}
      </span>
      <DkTable
        empty={!rows.length}
        head={[
          { label: "Sản phẩm", width: "46%" },
          { label: "Sản lượng" },
          { label: "DT", align: "right", width: "18%" },
        ]}>
        {rows.map((r) => (
          <tr key={r.name}>
            <DkTd className="text-[12px]">{r.name}</DkTd>
            <DkTd>
              <DkBar
                ratio={max ? r.quantity / max : 0}
                color={color}
                label={fmtNum(r.quantity)}
                labelWidth={56}
              />
            </DkTd>
            <DkTd align="right" mono>
              {fmtTr(r.revenue)}
            </DkTd>
          </tr>
        ))}
      </DkTable>
    </div>
  );
}

/** ★ TOP SẢN PHẨM BÁN CHẠY (SL) - LERMAO & PHƯỢNG HOÀNG */
export function DkTopProductsBlock({
  lermao,
  phuongHoang,
}: {
  lermao: DkTopProduct[];
  phuongHoang: DkTopProduct[];
}) {
  return (
    <DkSection badge="★ TOP SẢN PHẨM BÁN CHẠY (SL) - LERMAO & PHƯỢNG HOÀNG">
      <div className="grid gap-3 grid-cols-1 2xl:grid-cols-2">
        <TopTable
          title="★ TOP 5 LERMAO (SL)"
          rows={lermao}
          color={DK.lermao}
          bg={DK.lermaoBg}
        />
        <TopTable
          title="★ TOP 5 PHƯỢNG HOÀNG (SL)"
          rows={phuongHoang}
          color={DK.good}
          bg={DK.goodBg}
        />
      </div>
    </DkSection>
  );
}
