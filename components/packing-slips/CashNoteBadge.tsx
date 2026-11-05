import { Banknote } from "lucide-react";
import { noteCash } from "@/lib/packing/payment-note";
import type { InvoicePaymentNote } from "@/lib/types/invoice";
import { formatCurrency } from "@/lib/utils";

/** Nhãn "Thu tiền mặt …" (chữ đậm) cho hóa đơn ghi khách trả tiền mặt. */
export function CashNoteBadge({
  note,
  className = "",
}: {
  note?: InvoicePaymentNote | null;
  className?: string;
}) {
  const amount = noteCash(note);
  if (amount === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold text-amber-700 ${className}`}>
      <Banknote className="w-3.5 h-3.5 shrink-0" />
      {amount > 0 ? `Thu tiền mặt ${formatCurrency(amount)} đ` : "Thu tiền mặt"}
    </span>
  );
}
