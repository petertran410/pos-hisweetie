"use client";

import { Fragment } from "react";
import { pct, vi } from "@/lib/dashboard/format";
import type { LeadFunnelStage, LeadKpis } from "@/lib/dashboard/lead/leadDashboard.types";
import { LeadCard } from "./leadUi";

const STAGE_COLOR = ["#00B7CC", "#00A5B5", "#2E8B8F", "#1A5F6A", "#0D3B42"];

export function LeadFunnel({
  stages,
  conversion,
}: {
  stages: LeadFunnelStage[];
  conversion: LeadKpis["conversionRate"];
}) {
  const worst = stages.reduce<LeadFunnelStage | null>(
    (m, s) => (s.dropPct !== null && (!m || s.dropPct > (m.dropPct ?? 0)) ? s : m),
    null,
  );

  return (
    <LeadCard
      title="Phễu chuyển đổi"
      subtitle="Số lead đã đi qua từng tầng · tỷ lệ rơi so với tầng trước">
      <div className="space-y-1">
        {stages.map((s, i) => (
          <Fragment key={s.key}>
            {s.dropPct !== null && (
              <div className="flex items-center gap-3">
                <div className="w-[88px] shrink-0" />
                <div className="flex-1 flex items-center gap-2 text-[11.5px] pl-1">
                  <span style={{ color: "var(--dt-text-muted)" }}>↓</span>
                  <span
                    className="dt-mono font-semibold px-2 py-[1px] rounded-full"
                    style={{
                      background:
                        worst?.key === s.key
                          ? "rgba(192,57,43,0.12)"
                          : "rgba(201,168,76,0.14)",
                      color: worst?.key === s.key ? "#C0392B" : "#9A7A2A",
                    }}>
                    rơi {pct(s.dropPct)} (−{vi(s.dropCount ?? 0)})
                  </span>
                  {worst?.key === s.key && (
                    <span className="font-semibold" style={{ color: "#C0392B" }}>
                      · rơi nhiều nhất
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div
                className="w-[88px] shrink-0 text-[13px] font-medium"
                style={{ color: "var(--dt-text)" }}>
                {s.label}
              </div>
              <div
                className="flex-1 h-9 rounded-md relative"
                style={{ background: "var(--dt-bg-soft)" }}>
                <div
                  className="h-full rounded-md flex items-center px-3 dt-bar-fill"
                  style={{
                    width: `${Math.max(s.pctOfTop, 9)}%`,
                    background: STAGE_COLOR[i % STAGE_COLOR.length],
                  }}>
                  <span className="text-white text-[14px] font-bold dt-mono">
                    {vi(s.count)}
                  </span>
                </div>
              </div>
              <div
                className="w-[52px] shrink-0 text-right text-[12.5px] dt-mono"
                style={{ color: "var(--dt-text-secondary)" }}>
                {pct(s.pctOfTop)}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      <p
        className="mt-3 pt-3 text-[12px] leading-relaxed border-t"
        style={{ borderColor: "var(--dt-border)", color: "var(--dt-text-muted)" }}>
        Tỷ lệ chuyển đổi = Đã chuyển đổi ÷ (Tổng lead − Huỷ) ={" "}
        <b style={{ color: "var(--dt-text)" }}>{pct(conversion.value)}</b>. Tính
        trên cả lead Huỷ: {pct(conversion.rateOfAllLeads)}. Kỳ tính theo ngày tạo lead.
      </p>
    </LeadCard>
  );
}
