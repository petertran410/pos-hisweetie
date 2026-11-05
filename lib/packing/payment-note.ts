import type { InvoicePaymentNote } from "@/lib/types/invoice";

/**
 * Số tiền mặt cần thu theo ghi chú thanh toán mới nhất của 1 hóa đơn.
 * null = hóa đơn không ghi thu tiền mặt.
 */
export function noteCash(note?: InvoicePaymentNote | null): number | null {
  if (note?.paymentType !== "cash") return null;
  const amount = Number(note.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export interface InvoicePay {
  cash: boolean;
  amount: number;
  /** Mã các hóa đơn ghi thu tiền mặt. */
  codes: string[];
}

/**
 * Thanh toán theo các hóa đơn đã chọn (giống app): có hóa đơn ghi tiền mặt thì
 * thu tiền mặt, cộng số tiền của các hóa đơn đó. null = chưa hóa đơn nào có ghi chú.
 */
export function invoicePay(
  invoices: { code: string; paymentNote?: InvoicePaymentNote | null }[],
): InvoicePay | null {
  const cash = invoices.filter((i) => noteCash(i.paymentNote) !== null);
  if (cash.length === 0) {
    return invoices.some((i) => i.paymentNote)
      ? { cash: false, amount: 0, codes: [] }
      : null;
  }
  return {
    cash: true,
    amount: cash.reduce((sum, i) => sum + (noteCash(i.paymentNote) ?? 0), 0),
    codes: cash.map((i) => i.code),
  };
}

/**
 * Cảnh báo thu tiền mặt của phiếu giao hàng (backend trả về trong `cashWarning`):
 * - `transfer`: hóa đơn ghi thu tiền mặt nhưng phiếu chọn chuyển khoản;
 * - `amount`: tiền mặt cần thu trên phiếu khác tổng tiền mặt ghi trên các hóa đơn.
 */
export interface PackingCashWarning {
  kind: "transfer" | "amount";
  /** Tổng tiền mặt các hóa đơn ghi thu. */
  invoiceCash: number;
  /** Tiền mặt cần thu ghi trên phiếu (0 khi chuyển khoản). */
  slipCash: number;
  /** Mã các hóa đơn ghi thu tiền mặt. */
  codes: string[];
}

/** Lệch dưới mức này (đồng) coi như khớp, giống backend. */
const CASH_WARNING_EPSILON = 0.5;

/**
 * Tính cảnh báo ngay trên form, cùng quy tắc với backend: chưa hóa đơn nào có
 * ghi chú thanh toán thì không cảnh báo; nhiều hóa đơn tiền mặt thì cộng dồn.
 */
export function packingCashWarning(
  paymentMethod: string,
  cashAmount: number,
  invoices: { code: string; paymentNote?: InvoicePaymentNote | null }[],
): PackingCashWarning | null {
  const noted = invoices.filter((i) => i.paymentNote);
  if (noted.length === 0) return null;
  const cash = noted.filter((i) => noteCash(i.paymentNote) !== null);
  const invoiceCash = cash.reduce(
    (sum, i) => sum + (noteCash(i.paymentNote) ?? 0),
    0,
  );
  const codes = cash.map((i) => i.code);
  if (paymentMethod !== "cash") {
    return cash.length > 0
      ? { kind: "transfer", invoiceCash, slipCash: 0, codes }
      : null;
  }
  const slipCash = Number(cashAmount) || 0;
  return Math.abs(slipCash - invoiceCash) > CASH_WARNING_EPSILON
    ? { kind: "amount", invoiceCash, slipCash, codes }
    : null;
}
