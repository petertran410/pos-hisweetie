import {
  CASH_ADVANCE_STATUS_CLASSES,
  CASH_ADVANCE_STATUS_LABELS,
} from "@/lib/cash-advances/display";

export function CashAdvanceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        CASH_ADVANCE_STATUS_CLASSES[status] || "bg-gray-100 text-gray-700"
      }`}>
      {CASH_ADVANCE_STATUS_LABELS[status] || status}
    </span>
  );
}

/** Nhãn cảnh báo hoàn ứng của phiếu tạm ứng. */
export function RefundStateBadge({
  needsRefund,
  overdue,
}: {
  needsRefund: boolean;
  overdue: boolean;
}) {
  if (overdue)
    return (
      <span
        title="Quá 5 ngày sau kỳ mà chưa có phiếu hoàn ứng: người nhận không tạo được tạm ứng mới"
        className="inline-flex whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Quá hạn hoàn ứng
      </span>
    );
  if (needsRefund)
    return (
      <span
        title="Đã hết kỳ, còn tiền chưa dùng: cần làm phiếu hoàn ứng trong 5 ngày"
        className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Cần hoàn ứng
      </span>
    );
  return null;
}
