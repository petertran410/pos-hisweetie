"use client";

import type { FinanceData, FinRangeKey } from "@/lib/api/dashboard";
import { money, vi } from "@/lib/dashboard/format";
import { Wallet, FileText, Truck } from "lucide-react";

interface Props {
  data?: FinanceData;
  finRange: FinRangeKey;
  onFinRangeChange: (r: FinRangeKey) => void;
}

const FIN_RANGES: { key: FinRangeKey; label: string }[] = [
  { key: "d7", label: "7 ngày" },
  { key: "m30", label: "30 ngày" },
  { key: "all", label: "Tất cả" },
];

const FIN_RANGE_LABEL: Record<FinRangeKey, string> = {
  d7: "7 ngày gần nhất",
  m30: "30 ngày gần nhất",
  all: "toàn bộ công nợ",
};

function MiniBar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div
      className="h-[7px] rounded-[7px] overflow-hidden mt-[10px]"
      style={{ background: "var(--dt-border)" }}>
      <span
        className="block h-full rounded-[7px] dt-bar-fill"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: gradient }}
      />
    </div>
  );
}

export function FinancePanel({ data, finRange, onFinRangeChange }: Props) {
  const debt = data?.debt ?? 0;
  const overdue = data?.overdue ?? 0;
  const aging = data?.aging ?? { inTerm: 0, d1to30: 0, over30: 0 };
  const total = debt || 1;
  const overduePct = debt ? (overdue / debt) * 100 : 0;

  const cells = [
    {
      icon: <Wallet className="w-[14px] h-[14px]" />,
      label: "Tổng phải thu",
      value: money(debt),
      meta: `Quá hạn ${money(overdue)} · ${overduePct.toFixed(0)}%`,
      pct: overduePct,
      gradient: "linear-gradient(90deg,#C9A84C,#9A7A2A)",
    },
    {
      icon: <FileText className="w-[14px] h-[14px]" />,
      label: "HĐ còn phải thu",
      value: `${vi(data?.unpaidCount ?? 0)} HĐ`,
      meta:
        (data?.unpaidCount ?? 0) > 0
          ? `TB ${money(debt / (data!.unpaidCount || 1))}/HĐ`
          : "—",
      pct: Math.min(100, ((data?.unpaidCount ?? 0) / 100) * 100),
      gradient: "linear-gradient(90deg,#2E8B8F,#0D3B42)",
    },
    {
      icon: <Truck className="w-[14px] h-[14px]" />,
      label: "COD luân chuyển",
      value: money(data?.codAmount ?? 0),
      meta: `${data?.codCount ?? 0} đơn đang luân chuyển`,
      pct: 68,
      gradient: "linear-gradient(90deg,#00B7CC,#1A5F6A)",
    },
  ];

  const agingRows = [
    { label: "Trong hạn", val: aging.inTerm, color: "#2E8B8F" },
    { label: "Quá hạn 1–30 ngày", val: aging.d1to30, color: "#C9A84C" },
    { label: "Quá hạn > 30 ngày", val: aging.over30, color: "#C0392B" },
  ];

  return (
    <div className="dt-panel flex flex-col">
      <div className="flex items-center gap-3 p-[17px_20px] border-b" style={{ borderColor: "var(--dt-border)" }}>
        <div>
          <h3 className="text-[15.5px] font-bold">Công nợ &amp; COD</h3>
          <div className="text-[12.5px] mt-0.5" style={{ color: "var(--dt-text-muted)" }}>
            Dòng tiền cần thu hồi · {FIN_RANGE_LABEL[finRange]}
          </div>
        </div>
        <div className="ml-auto dt-seg dt-seg-sm">
          {FIN_RANGES.map((r) => (
            <button
              key={r.key}
              data-on={finRange === r.key}
              onClick={() => onFinRangeChange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-[18px_20px] flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
          {cells.map((c) => (
            <div
              key={c.label}
              className="rounded-[8px] border p-4"
              style={{ background: "var(--dt-bg-soft)", borderColor: "var(--dt-border)" }}>
              <div
                className="text-[12.5px] flex items-center gap-[7px] mb-2"
                style={{ color: "var(--dt-text-secondary)" }}>
                {c.icon}
                {c.label}
              </div>
              <div
                className="text-[22px] font-bold tracking-tight dt-mono"
                style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
                {c.value}
              </div>
              <div className="text-[12px] mt-[5px]" style={{ color: "var(--dt-text-muted)" }}>
                {c.meta}
              </div>
              <MiniBar pct={c.pct} gradient={c.gradient} />
            </div>
          ))}
        </div>

        <div
          className="mt-[18px] mb-2 text-[13px] font-semibold uppercase tracking-wider flex items-center gap-[10px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Phân tuổi nợ
          <span className="flex-1 h-px" style={{ background: "var(--dt-border)" }} />
        </div>
        {agingRows.map((r) => (
          <div key={r.label} className="flex items-center gap-[10px] py-2 text-[13px]">
            <span className="flex-1" style={{ color: "var(--dt-text-secondary)" }}>
              {r.label}
            </span>
            <span
              className="h-2 rounded-full overflow-hidden flex-[2]"
              style={{ background: "var(--dt-cyan-bg)" }}>
              <span
                className="block h-full rounded-full dt-bar-fill"
                style={{ width: `${(r.val / total) * 100}%`, background: r.color }}
              />
            </span>
            <span className="dt-mono font-semibold min-w-[74px] text-right text-[12.5px]">
              {money(r.val)}
            </span>
          </div>
        ))}
        <p className="text-[11px] mt-3" style={{ color: "var(--dt-text-muted)" }}>
          * Tuổi nợ tính theo ngày tạo đơn (hệ thống chưa lưu hạn thanh toán).
        </p>
      </div>
    </div>
  );
}
