"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Link2,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DeltaDir } from "@/components/dashboard/KpiCard";
import { deltaPct, money, pct, vi } from "@/lib/dashboard/format";
import type { SmaxKpi, SmaxKpis } from "@/lib/dashboard/smax/smaxDashboard.types";

type Better = "up" | "down" | "none";
type Tone = "good" | "bad" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  good: "#2E8B8F",
  bad: "#C0392B",
  neutral: "#5A8A92",
};

/** Ngưỡng cảnh báo tỉ lệ gửi lỗi (%). */
const FAILURE_WARN_PCT = 5;

function delta(k: SmaxKpi, better: Better) {
  if (k.changePct === null) return { text: "—", dir: "flat" as DeltaDir, tone: "neutral" as Tone };
  const dir: DeltaDir = k.changePct > 0 ? "up" : k.changePct < 0 ? "down" : "flat";
  const tone: Tone =
    better === "none" || dir === "flat" ? "neutral" : dir === better ? "good" : "bad";
  return { text: deltaPct(k.changePct), dir, tone };
}

/**
 * Thẻ KPI cùng khung / kiểu chữ với KpiCard của dashboard (lớp dt-kpi), thêm dòng
 * chi tiết (tử số / mẫu số…) và màu cảnh báo cho giá trị — KpiCard chung không có 2 chỗ này.
 */
function SmaxKpiCard({
  name,
  value,
  valueSuffix,
  valueTitle,
  kpi,
  better,
  vs,
  detail,
  icon,
  colors,
  warn = false,
}: {
  name: string;
  value: string;
  valueSuffix?: string;
  valueTitle?: string;
  kpi: SmaxKpi;
  better: Better;
  vs?: string;
  detail?: ReactNode;
  icon: ReactNode;
  colors: [bg: string, fg: string, accent: string];
  warn?: boolean;
}) {
  const d = delta(kpi, better);
  const accent = warn ? "#C0392B" : colors[2];
  return (
    <div className="dt-kpi relative overflow-hidden p-[18px]">
      <div className="flex items-center gap-[9px] mb-[13px]">
        <span
          className="w-[34px] h-[34px] rounded-[9px] grid place-items-center flex-none"
          style={warn ? { background: "rgba(192,57,43,0.1)", color: "#C0392B" } : { background: colors[0], color: colors[1] }}>
          {icon}
        </span>
        <span
          className="text-[12.5px] font-medium leading-tight"
          style={{ color: "var(--dt-text-secondary)" }}>
          {name}
        </span>
      </div>
      <div
        title={valueTitle}
        className="text-[27px] font-bold leading-[1.1] tracking-tight dt-mono"
        style={{ fontFamily: "var(--font-sans)", color: warn ? "#C0392B" : undefined }}>
        {value}
        {valueSuffix && (
          <small
            className="text-[14px] font-semibold ml-0.5"
            style={{ color: warn ? "#C0392B" : "var(--dt-text-muted)" }}>
            {valueSuffix}
          </small>
        )}
      </div>
      {detail && (
        <div className="mt-1 text-[12px] leading-snug" style={{ color: "var(--dt-text-muted)" }}>
          {detail}
        </div>
      )}
      <div className="flex items-center gap-2 mt-[9px] text-[12.5px]">
        <span
          className="inline-flex items-center gap-[3px] font-semibold dt-mono"
          style={{ color: TONE_COLOR[d.tone] }}>
          {d.dir === "up" && <TrendingUp className="w-[13px] h-[13px]" />}
          {d.dir === "down" && <TrendingDown className="w-[13px] h-[13px]" />}
          {d.text}
        </span>
        {vs && <span style={{ color: "var(--dt-text-muted)" }}>{vs}</span>}
      </div>
      <div
        className="mt-3 h-[3px] rounded-[3px] overflow-hidden"
        style={{ background: "var(--dt-border)" }}>
        <span
          className="block h-full rounded-[3px] dt-bar-fill"
          style={{ background: accent, width: "70%" }}
        />
      </div>
    </div>
  );
}

const pctValue = (n: number) => pct(n).replace("%", "");

export function SmaxKpiGrid({
  kpis,
  compareLabel,
}: {
  kpis: SmaxKpis;
  compareLabel: string | null;
}) {
  const vs = compareLabel ? `so với ${compareLabel}` : undefined;
  const icon = "w-[18px] h-[18px]";
  const cyan: [string, string, string] = ["#E0F6F9", "#00A5B5", "#00B7CC"];
  const teal: [string, string, string] = ["#E6F2F2", "#2E8B8F", "#2E8B8F"];
  const gold: [string, string, string] = ["#FBF3DF", "#9A7A2A", "#C9A84C"];
  const { coverage, leadConversion, chatRevenue, failureRate } = kpis;

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
      <SmaxKpiCard
        name="Nhân viên dùng chat"
        value={vi(kpis.activeStaff.value)}
        kpi={kpis.activeStaff}
        better="up"
        vs={vs}
        icon={<Users className={icon} />}
        colors={cyan}
      />
      <SmaxKpiCard
        name="Tin gửi từ POS"
        value={vi(kpis.messages.value)}
        kpi={kpis.messages}
        better="up"
        vs={vs}
        icon={<Send className={icon} />}
        colors={cyan}
      />
      <SmaxKpiCard
        name="Lượt gắn khách"
        value={vi(kpis.links.value)}
        kpi={kpis.links}
        better="up"
        vs={vs}
        icon={<Link2 className={icon} />}
        colors={teal}
      />
      <SmaxKpiCard
        name="Độ phủ Zalo"
        value={pctValue(coverage.value)}
        valueSuffix="%"
        kpi={coverage}
        better="up"
        vs={vs}
        detail={`${vi(coverage.num)}/${vi(coverage.den)} khách có hoá đơn`}
        icon={<ShieldCheck className={icon} />}
        colors={teal}
      />
      <SmaxKpiCard
        name="Lead từ chat → chuyển đổi"
        value={pctValue(leadConversion.value)}
        valueSuffix="%"
        kpi={leadConversion}
        better="up"
        vs={vs}
        detail={`${vi(leadConversion.num)}/${vi(leadConversion.den)} lead`}
        icon={<BadgeCheck className={icon} />}
        colors={gold}
      />
      <SmaxKpiCard
        name="Doanh thu khách được chat"
        value={money(chatRevenue.value)}
        valueTitle={`${vi(chatRevenue.value)} ₫`}
        kpi={chatRevenue}
        better="up"
        vs={vs}
        detail={
          <>
            {vi(chatRevenue.customers)} khách · {vi(chatRevenue.invoices)} HĐ
            <br />
            trong 7 ngày sau lần chat đầu
          </>
        }
        icon={<Wallet className={icon} />}
        colors={gold}
      />
      <SmaxKpiCard
        name="Tỉ lệ gửi lỗi"
        value={pctValue(failureRate.value)}
        valueSuffix="%"
        kpi={failureRate}
        better="down"
        vs={vs}
        detail={`${vi(failureRate.num)}/${vi(failureRate.den)} lượt`}
        icon={<AlertTriangle className={icon} />}
        colors={cyan}
        warn={failureRate.value > FAILURE_WARN_PCT}
      />
    </div>
  );
}
