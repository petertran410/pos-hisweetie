"use client";

import { DebtStatus, DEBT_STATUS_LABELS } from "@/lib/api/debt-tracking";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const STYLES: Record<
  DebtStatus,
  { bg: string; text: string; border: string; Icon: LucideIcon }
> = {
  OVERDUE: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    Icon: AlertTriangle,
  },
  DUE: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    Icon: Clock,
  },
  NORMAL: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    Icon: CheckCircle2,
  },
};

/** Màu nền cho cả dòng trong bảng, theo trạng thái nợ. */
export const ROW_TINT: Record<DebtStatus, string> = {
  OVERDUE: "bg-red-50/60 hover:bg-red-50",
  DUE: "bg-orange-50/50 hover:bg-orange-50",
  NORMAL: "hover:bg-gray-50",
};

export function DebtStatusBadge({
  status,
  daysOverdue,
  className = "",
}: {
  status: DebtStatus;
  daysOverdue?: number;
  className?: string;
}) {
  const s = STYLES[status] ?? STYLES.NORMAL;
  const { Icon } = s;

  const label =
    status === "OVERDUE" && daysOverdue && daysOverdue > 0
      ? `Quá hạn ${daysOverdue} ngày`
      : DEBT_STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${s.bg} ${s.text} ${s.border} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}
