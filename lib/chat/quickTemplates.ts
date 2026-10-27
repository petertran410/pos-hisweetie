import { formatCurrency } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, type Invoice } from "@/lib/types/invoice";
import { ORDER_STATUS_LABELS, type Order } from "@/lib/types/order";
import type { DebtTrackingDetail } from "@/lib/api/debt-tracking";
import type { CartLine } from "@/lib/store/posInView";

// Mẫu tin gửi nhanh thông tin POS qua Zalo — chữ thuần, sale sửa được trước khi gửi.

const vnd = (n: number | string | null | undefined) => `${formatCurrency(Number(n ?? 0))}đ`;
const day = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "";

interface DocLine {
  productName?: string;
  productCode?: string;
  quantity: number;
  price?: number;
  totalPrice?: number;
  isGift?: boolean;
}

function docLines(lines: DocLine[]) {
  return lines.map((l) =>
    l.isGift
      ? `• ${l.productName} x${l.quantity} (tặng)`
      : `• ${l.productName} x${l.quantity} = ${formatCurrency(Number(l.totalPrice ?? 0))}`
  );
}

function moneyFooter(
  doc: { totalAmount?: number; discount?: number; shippingFee?: number; grandTotal: number; paidAmount: number; debtAmount: number },
  showDebt: boolean
) {
  const out: string[] = [];
  if (Number(doc.discount) > 0 || Number(doc.shippingFee) > 0) {
    out.push(`Tiền hàng: ${vnd(doc.totalAmount)}`);
    if (Number(doc.discount) > 0) out.push(`Giảm giá: -${vnd(doc.discount)}`);
    if (Number(doc.shippingFee) > 0) out.push(`Phí giao hàng: ${vnd(doc.shippingFee)}`);
  }
  out.push(`Tổng cộng: ${vnd(doc.grandTotal)}`);
  out.push(`Đã thanh toán: ${vnd(doc.paidAmount)}`);
  if (showDebt && Number(doc.debtAmount) > 0) out.push(`Còn nợ: ${vnd(doc.debtAmount)}`);
  return out;
}

export function invoiceText(inv: Invoice, showDebt: boolean) {
  return [
    `🧾 Hóa đơn ${inv.code} – ${day(inv.purchaseDate)}`,
    ...docLines((inv.details ?? []) as DocLine[]),
    ...moneyFooter(inv, showDebt),
    `Trạng thái: ${INVOICE_STATUS_LABELS[inv.status] ?? inv.statusValue ?? ""}`,
  ].join("\n");
}

export function orderText(order: Order, showDebt: boolean) {
  const status = (ORDER_STATUS_LABELS as Record<number, string>)[order.status] ?? order.statusValue ?? "";
  return [
    `📋 Đơn đặt hàng ${order.code} – ${day(order.orderDate)}`,
    ...docLines((order.items ?? []) as DocLine[]),
    ...moneyFooter(order, showDebt),
    `Trạng thái: ${status}`,
  ].join("\n");
}

export function productText(p: {
  name: string;
  code: string;
  unit?: string | null;
  price: number | null;
  inStock: boolean | null;
}) {
  const unit = p.unit ? `/${p.unit}` : "";
  return [
    `📦 ${p.name} (${p.code})`,
    p.unit ? `Quy cách: ${p.unit}` : null,
    p.price !== null ? `Giá: ${vnd(p.price)}${unit}` : null,
    p.inStock !== null ? `Tình trạng: ${p.inStock ? "Còn hàng" : "Hết hàng"}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function cartText(lines: CartLine[], showPrice: boolean) {
  const total = lines.reduce((s, l) => s + (l.isGift ? 0 : l.quantity * l.price - l.discount), 0);
  return [
    "🛒 Báo giá đơn hàng",
    ...lines.map((l) => {
      const unit = l.unit ? ` ${l.unit}` : "";
      if (l.isGift) return `• ${l.name} x${l.quantity}${unit} (tặng)`;
      return showPrice
        ? `• ${l.name} x${l.quantity}${unit} × ${formatCurrency(l.price)} = ${formatCurrency(
            l.quantity * l.price - l.discount
          )}`
        : `• ${l.name} x${l.quantity}${unit}`;
    }),
    showPrice ? `Tổng cộng: ${vnd(total)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PaymentBank {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export function debtText(
  customer: { code: string | null; name: string },
  debt: { total: number; overdue: number | null; invoices: { code: string; date: string; outstanding: number; daysOverdue?: number }[] },
  bank: PaymentBank | null
) {
  const out = [
    `💳 Thông tin công nợ – ${customer.code ? `${customer.code} ` : ""}${customer.name}`,
    `Tính đến ngày ${day(new Date())}`,
    `Tổng nợ: ${vnd(debt.total)}`,
  ];
  if (debt.overdue) out.push(`Quá hạn: ${vnd(debt.overdue)}`);
  if (debt.invoices.length) {
    out.push("Hóa đơn còn nợ:");
    for (const i of debt.invoices) {
      const late = i.daysOverdue && i.daysOverdue > 0 ? ` – quá hạn ${i.daysOverdue} ngày` : "";
      out.push(`• ${i.code} (${day(i.date)}) còn ${vnd(i.outstanding)}${late}`);
    }
  }
  if (bank) {
    out.push(
      "Thông tin chuyển khoản:",
      `Ngân hàng: ${bank.bankName}`,
      `Số tài khoản: ${bank.accountNumber}`,
      `Chủ tài khoản: ${bank.accountHolder}`,
      `Nội dung: ${customer.code ?? customer.name}`
    );
  }
  return out.join("\n");
}

/** Báo đơn giao hàng — theo mẫu tin báo đơn gửi nhóm (Giao hàng thành công). */
export function packingSlipText(p: {
  code: string;
  createdAt: string;
  numberOfPackages: number;
  paymentMethod: string;
  cashAmount?: number | null;
  branchName?: string | null;
  documents: { code: string; customerName?: string | null; soldByName?: string | null }[];
  creatorName?: string | null;
  hasColdItems?: boolean;
}) {
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const t = new Date(p.createdAt);
  const time = `${t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${t.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  const payment =
    p.paymentMethod === "cash"
      ? `Tiền mặt${Number(p.cashAmount) > 0 ? ` ${vnd(p.cashAmount)}` : ""}`
      : p.paymentMethod === "transfer"
        ? "Chuyển khoản"
        : p.paymentMethod;
  const customers = uniq(p.documents.map((d) => d.customerName));
  const sellers = uniq(p.documents.map((d) => d.soldByName));
  return [
    p.hasColdItems &&
      "⚠️ CẢNH BÁO: ĐƠN CÓ HÀNG LẠNH. QUÝ KHÁCH LƯU Ý BẢO QUẢN TỦ ĐÔNG NGAY KHI NHẬN HÀNG.",
    `🎉 Báo đơn ${p.code} - Giao hàng thành công`,
    p.branchName && `🏪 Chi nhánh: ${p.branchName}`,
    p.documents.length && `🧾 Hoá đơn: ${p.documents.map((d) => d.code).join(", ")}`,
    customers.length && `👤 Khách hàng: ${customers.join(", ")}`,
    `📦 Số kiện: ${p.numberOfPackages}`,
    `⏰ Thời gian: ${time}`,
    `💰 Thanh toán: ${payment}`,
    sellers.length && `👨‍💼 Người bán: ${sellers.join(", ")}`,
    p.creatorName && `👤 Nhân viên giao hàng: ${p.creatorName}`,
  ]
    .filter(Boolean)
    .join("\n");
}
