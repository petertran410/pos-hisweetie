"use client";

import { Fragment } from "react";
import { pct, vi } from "@/lib/dashboard/format";
import type { SmaxFunnelStage } from "@/lib/dashboard/smax/smaxDashboard.types";
import { LeadCard } from "@/components/reports/lead/leadUi";

const STAGE_COLOR = ["#00B7CC", "#2E8B8F", "#0D3B42"];

/** Phễu lead có hội thoại → chuyển Sale → chuyển đổi (cùng kiểu LeadFunnel). */
export function SmaxFunnel({ stages }: { stages: SmaxFunnelStage[] }) {
  return (
    <LeadCard
      title="Phễu lead từ chat"
      subtitle="Lead có hội thoại tạo trong kỳ · % so với tầng đầu">
      <div className="space-y-1">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : null;
          const drop = prev ? ((prev - s.value) / prev) * 100 : null;
          return (
            <Fragment key={s.key}>
              {drop !== null && prev !== null && (
                <div className="flex items-center gap-3">
                  <div className="w-[120px] shrink-0" />
                  <div className="flex-1 flex items-center gap-2 text-[11.5px] pl-1">
                    <span style={{ color: "var(--dt-text-muted)" }}>↓</span>
                    <span
                      className="dt-mono font-semibold px-2 py-[1px] rounded-full"
                      style={{ background: "rgba(201,168,76,0.14)", color: "#9A7A2A" }}>
                      rơi {pct(drop)} (−{vi(prev - s.value)})
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className="w-[120px] shrink-0 text-[13px] font-medium"
                  style={{ color: "var(--dt-text)" }}>
                  {s.label}
                </div>
                <div
                  className="flex-1 h-9 rounded-md relative"
                  style={{ background: "var(--dt-bg-soft)" }}>
                  <div
                    className="h-full rounded-md flex items-center px-3 dt-bar-fill"
                    style={{
                      width: `${Math.max(s.pct, 9)}%`,
                      background: STAGE_COLOR[i % STAGE_COLOR.length],
                    }}>
                    <span className="text-white text-[14px] font-bold dt-mono">{vi(s.value)}</span>
                  </div>
                </div>
                <div
                  className="w-[52px] shrink-0 text-right text-[12.5px] dt-mono"
                  style={{ color: "var(--dt-text-secondary)" }}>
                  {pct(s.pct)}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </LeadCard>
  );
}
