"use client";

import { Check } from "lucide-react";
import type { JourneyMilestone, LeadStatus } from "@/lib/types/lead";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });

/**
 * Mốc hành trình suy ra từ trạng thái lead (bảng lead, sidechat — không gọi thêm API):
 * Lead → Chuyển Sale → Mã KH → Đặt hàng.
 */
export function stageMilestones(lead: { status: LeadStatus; customerId: number | null }): JourneyMilestone[] {
  const steps: [JourneyMilestone["key"], string, boolean][] = [
    ["lead", "Tạo lead", true],
    ["handover", "Chuyển Sale", lead.status === "handed_over" || lead.status === "converted" || !!lead.customerId],
    ["customer", "Mã KH", !!lead.customerId],
    ["order", "Đặt hàng", lead.status === "converted"],
  ];
  return steps.map(([key, label, done]) => ({ key, label, done, at: null, ref: null }));
}

/** Thanh mốc hành trình; compact = chỉ chấm (bảng, sidechat). */
export function JourneyStepper({ milestones, compact = false }: { milestones: JourneyMilestone[]; compact?: boolean }) {
  if (compact) {
    const doneCount = milestones.filter((m) => m.done).length;
    return (
      <span
        className="inline-flex items-center"
        title={milestones.map((m) => `${m.done ? "✓" : "○"} ${m.label}`).join("\n")}
        aria-label={`Hành trình: ${doneCount}/${milestones.length} mốc`}>
        {milestones.map((m, i) => (
          <span key={m.key} className="inline-flex items-center">
            {i > 0 && <span className={`h-0.5 w-2.5 ${m.done ? "bg-brand" : "bg-gray-200"}`} />}
            <span className={`h-2 w-2 rounded-full ${m.done ? "bg-brand" : "border border-gray-300 bg-white"}`} />
          </span>
        ))}
      </span>
    );
  }
  return (
    <ol className="flex w-full items-start">
      {milestones.map((m, i) => (
        <li key={m.key} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
          {/* Đường nối với mốc trước */}
          {i > 0 && (
            <span
              className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${m.done ? "bg-brand" : "bg-gray-200"}`}
            />
          )}
          <span
            className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              m.done ? "bg-brand text-white" : "border-2 border-gray-300 bg-white text-gray-400"
            }`}>
            {m.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={`mt-1 text-xs font-medium ${m.done ? "text-gray-900" : "text-gray-400"}`}>{m.label}</span>
          <span className="max-w-full truncate px-1 text-[11px] text-gray-500">
            {[m.ref, m.at && fmt(m.at)].filter(Boolean).join(" · ") || " "}
          </span>
        </li>
      ))}
    </ol>
  );
}
