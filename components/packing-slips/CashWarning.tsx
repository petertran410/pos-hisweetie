import { AlertTriangle } from "lucide-react";
import type { PackingCashWarning } from "@/lib/packing/payment-note";
import { formatCurrency } from "@/lib/utils";

/** Câu cảnh báo đầy đủ: phiếu giao hàng lệch tiền mặt so với hóa đơn. */
export function cashWarningText(w: PackingCashWarning): string {
  const codes = w.codes.length ? ` (${w.codes.join(", ")})` : "";
  return w.kind === "transfer"
    ? `Hóa đơn ghi thu tiền mặt ${formatCurrency(w.invoiceCash)} đ${codes} nhưng phiếu chọn chuyển khoản.`
    : `Tiền mặt cần thu ${formatCurrency(w.slipCash)} đ khác hóa đơn ${formatCurrency(w.invoiceCash)} đ${codes}.`;
}

/** Nhãn đỏ gọn cho bảng / thẻ danh sách báo đơn. */
export function CashWarningBadge({
  warning,
  className = "",
}: {
  warning?: PackingCashWarning | null;
  className?: string;
}) {
  if (!warning) return null;
  return (
    <span
      className={`inline-flex items-start gap-1 text-xs font-semibold text-red-600 ${className}`}
      title={cashWarningText(warning)}>
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>
        {warning.kind === "transfer"
          ? `HĐ thu tiền mặt ${formatCurrency(warning.invoiceCash)} đ, phiếu chuyển khoản`
          : `Lệch tiền mặt: phiếu ${formatCurrency(warning.slipCash)} đ, HĐ ${formatCurrency(warning.invoiceCash)} đ`}
      </span>
    </span>
  );
}

/** Khung đỏ cảnh báo (chi tiết phiếu, form nhập phiếu). */
export function CashWarningBox({
  warning,
  title = "Lệch tiền mặt với hóa đơn",
  className = "",
}: {
  warning?: PackingCashWarning | null;
  title?: string;
  className?: string;
}) {
  if (!warning) return null;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 ${className}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {title}
      </div>
      <p className="mt-0.5 text-xs">{cashWarningText(warning)}</p>
    </div>
  );
}
