"use client";

import { Info } from "lucide-react";
import { vi } from "@/lib/dashboard/format";
import type { SmaxThreadStats } from "@/lib/dashboard/smax/smaxDashboard.types";
import { LeadCard } from "@/components/reports/lead/leadUi";

function Tile({
  title,
  hint,
  total,
  direct,
  group,
}: {
  title: string;
  hint: string;
  total: number;
  direct: number;
  group: number;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--dt-bg-soft)" }}>
      <div
        className="flex items-center gap-1.5 text-[12.5px] font-medium"
        style={{ color: "var(--dt-text-secondary)" }}>
        {title}
        <span title={hint} aria-label={hint} className="cursor-help">
          <Info className="w-3.5 h-3.5" style={{ color: "var(--dt-text-muted)" }} />
        </span>
      </div>
      <div className="text-[24px] font-bold leading-tight dt-mono mt-1">{vi(total)}</div>
      <div className="flex gap-3 mt-1.5 text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
        <span>
          Trực tiếp <b className="dt-mono" style={{ color: "var(--dt-text)" }}>{vi(direct)}</b>
        </span>
        <span>
          Nhóm <b className="dt-mono" style={{ color: "var(--dt-text)" }}>{vi(group)}</b>
        </span>
      </div>
    </div>
  );
}

/** Hội thoại theo Smax (New / Renew) — không so kỳ trước. */
export function SmaxThreadsCard({ threads }: { threads: SmaxThreadStats }) {
  return (
    <LeadCard title="Hội thoại (Smax)" subtitle="Đếm theo dữ liệu Smax · không so với kỳ trước">
      {!threads.available ? (
        <p className="text-[13px] py-6 text-center" style={{ color: "var(--dt-text-muted)" }}>
          {threads.note ?? "Chưa có số liệu hội thoại cho kỳ này."}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile
              title="New"
              hint="Thread tạo trong kỳ"
              total={threads.newTotal}
              direct={threads.newDirect}
              group={threads.newGroup}
            />
            <Tile
              title="Renew"
              hint="Thread tạo trước kỳ, có tin cuối trong kỳ"
              total={threads.renewTotal}
              direct={threads.renewDirect}
              group={threads.renewGroup}
            />
            <div className="rounded-lg p-3 border border-dashed" style={{ borderColor: "var(--dt-border)" }}>
              <div className="text-[12.5px] font-medium" style={{ color: "var(--dt-text-secondary)" }}>
                Có thể gắn khách
              </div>
              <span
                className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--dt-bg-soft)", color: "var(--dt-text-muted)" }}>
                Sắp có
              </span>
            </div>
          </div>
          {(threads.partial || threads.note) && (
            <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--dt-text-muted)" }}>
              {threads.partial
                ? "Kỳ đã qua: Renew chỉ tính thread có tin cuối trong kỳ, có thể thiếu."
                : threads.note}
            </p>
          )}
        </>
      )}
    </LeadCard>
  );
}
