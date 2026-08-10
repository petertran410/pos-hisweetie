"use client";

import {
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  RELIABILITY_LABEL,
  SEVERITY_STYLE,
  type FlagSeverity,
  type PriorityLevel,
  type ReliabilityLevel,
} from "@/lib/types/purchasing-planning";

/** Badge mức độ ưu tiên — PRD §10.3 */
export function PriorityBadge({
  priority,
  size = "md",
}: {
  priority: PriorityLevel;
  size?: "sm" | "md";
}) {
  const style = PRIORITY_STYLE[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${
        style.badge
      } ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** Badge độ tin cậy tổng hợp — PRD §11.3 */
export function ReliabilityBadge({
  reliability,
}: {
  reliability: ReliabilityLevel;
}) {
  const map: Record<ReliabilityLevel, string> = {
    RELIABLE: "bg-green-50 text-green-700 border-green-200",
    CAUTION: "bg-yellow-50 text-yellow-700 border-yellow-200",
    UNRELIABLE: "bg-orange-50 text-orange-700 border-orange-200",
    BLOCKED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${map[reliability]}`}>
      {RELIABILITY_LABEL[reliability]}
    </span>
  );
}

/** Badge mức nghiêm trọng của cảnh báo dữ liệu */
export function SeverityBadge({ severity }: { severity: FlagSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[severity]}`}>
      {severity}
    </span>
  );
}
