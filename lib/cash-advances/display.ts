import type {
  CashAdvanceOutsideReason,
  CashAdvanceStatus,
} from "@/lib/api/cash-advances";

/** Chỉ quỹ Kho HN, Kho SG được tạm ứng. */
export const CASH_ADVANCE_BRANCH_IDS = [6, 1];

/** Ân hạn làm hoàn ứng sau khi hết kỳ tạm ứng. */
export const CASH_ADVANCE_GRACE_DAYS = 5;

export const CASH_ADVANCE_STATUS_OPTIONS: Array<{
  value: CashAdvanceStatus;
  label: string;
}> = [
  { value: "DRAFT", label: "Phiếu tạm" },
  { value: "CONFIRMING", label: "Đang xác nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Hủy" },
];

export const CASH_ADVANCE_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(
    CASH_ADVANCE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
  );

export const CASH_ADVANCE_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
};

export const OUTSIDE_REASON_LABELS: Record<CashAdvanceOutsideReason, string> = {
  OTHER_ADVANCE: "Trừ vào tạm ứng khác",
  FUND: "Đã chi thẳng từ quỹ",
  OVER_LIMIT: "Vượt số tạm ứng",
  NOT_CONFIRMED: "Tạm ứng chưa giao tiền",
  LARK_LEDGER: "Đã trừ quỹ trên Lark",
  CASH_FLOW: "Phiếu chi lịch sử",
};

/** Phiếu đã giao / nhận tiền (đã ghi quỹ). */
export const isPostedAdvance = (status: string) =>
  status === "CONFIRMING" || status === "COMPLETED";

/** dd/mm/yyyy của ngày yyyy-mm-dd. */
export const formatDateKey = (key?: string | null) => {
  if (!key) return "-";
  const [year, month, day] = key.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "-";
};
