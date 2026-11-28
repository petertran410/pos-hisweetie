/**
 * Tính VAT phía client — KHỚP TUYỆT ĐỐI với backend misa-vat.util.ts (computeLineVat)
 * để số liệu hiển thị trên trang Hóa đơn VAT giống hệt chứng từ đẩy lên Misa.
 *
 * Công thức cho 1 dòng hàng (giá nhập là giá ĐÃ GỒM thuế):
 *   - unitPriceAfterTax = price - discount            (đơn giá sau thuế)
 *   - unitPrice         = round((price - discount) / (1 + rate/100), 2)  (đơn giá trước thuế)
 *   - amountBeforeTax   = round(unitPrice * quantity)  (thành tiền trước thuế)
 *   - vatAmount         = trunc(amountBeforeTax * rate / 100)
 *   - amountAfterTax    = amountBeforeTax + vatAmount  (thành tiền sau thuế)
 */

import { LINE_VAT_PRODUCT_CODES } from "@/lib/utils/line-vat";

export const MISA_VAT_RATE = 8;

/**
 * Loại thuế của 1 dòng — KHỚP backend misa-vat.util.ts (resolveLineVatRate).
 *  - VAT  : chịu thuế GTGT theo `rate` (%).
 *  - KKKNT: không kê khai nộp thuế — KHÔNG phải thuế suất 0%; không bóc thuế,
 *           tiền thuế = 0 (Misa vat_rate = -2).
 */
export type LineVatKind = "VAT" | "KKKNT";

export interface ResolvedLineVat {
  kind: LineVatKind;
  /** % thuế khi kind = VAT (với KKKNT là null — không có thuế suất). */
  rate: number | null;
  /** "8%", "5%" hoặc "KKKNT" (không bao giờ "0%" cho KKKNT). */
  label: string;
}

/**
 * SP trong LINE_VAT_PRODUCT_CODES đã chọn GTGT trên POS: 5 → VAT 5%,
 * 0 → KKKNT. Còn lại (SP khác, dòng chứng từ cũ chưa chọn) → fallbackRate.
 */
export function resolveLineVatRate(
  line: {
    productCode?: string | null;
    product?: { code?: string | null } | null;
    lineVatRate?: number | string | null;
  },
  fallbackRate: number = MISA_VAT_RATE
): ResolvedLineVat {
  const code = String(line.product?.code ?? line.productCode ?? "").trim();
  if (LINE_VAT_PRODUCT_CODES.includes(code) && line.lineVatRate != null) {
    const chosen = Number(line.lineVatRate);
    if (chosen === 0) return { kind: "KKKNT", rate: null, label: "KKKNT" };
    if (Number.isFinite(chosen) && chosen > 0) {
      return { kind: "VAT", rate: chosen, label: `${chosen}%` };
    }
  }
  return { kind: "VAT", rate: fallbackRate, label: `${fallbackRate}%` };
}

export interface VatLineInput {
  quantity: number | string;
  price: number | string;
  discount?: number | string | null;
  /**
   * % VAT riêng của dòng (vd lấy từ product.vat). Nếu không set thì dùng
   * tham số vatRate của computeInvoiceVat (mặc định MISA_VAT_RATE = 8).
   */
  vatRate?: number | null;
  /** Loại thuế đã resolve — ưu tiên hơn vatRate (dùng cho KKKNT / GTGT dòng). */
  resolvedVat?: ResolvedLineVat | null;
}

export interface VatLineResult {
  quantity: number;
  /** Đơn giá trước thuế (đã bóc VAT) */
  unitPriceBeforeTax: number;
  /** Đơn giá sau thuế (price - discount) */
  unitPriceAfterTax: number;
  /** % VAT */
  vatRate: number;
  /** Giảm giá (đơn vị tiền, trên 1 đơn vị) */
  discount: number;
  /** Thành tiền trước thuế */
  amountBeforeTax: number;
  /** Tiền thuế VAT của dòng */
  vatAmount: number;
  /** Thành tiền sau thuế */
  amountAfterTax: number;
}

export function computeLineVat(
  line: VatLineInput,
  vatRate: number = MISA_VAT_RATE
): VatLineResult {
  const quantity = Number(line.quantity);
  const originalPrice = Number(line.price);
  const discountAmount = Number(line.discount || 0);

  const unitPriceAfterTax = originalPrice - discountAmount;
  const unitPriceBeforeTax =
    Math.round((unitPriceAfterTax / (1 + vatRate / 100)) * 100) / 100;
  // Neo THÀNH TIỀN SAU THUẾ vào giá đã gồm thuế (đơn giá sau thuế × số lượng),
  // rồi bóc ngược tiền trước thuế và VAT từ đó. Nhờ vậy trên TỪNG dòng luôn có
  // amountBeforeTax + vatAmount === amountAfterTax, và tổng sau thuế của cả hóa
  // đơn === tổng tiền hàng (không bị lệch do làm tròn/cắt từng dòng).
  const amountAfterTax = Math.round(unitPriceAfterTax * quantity);
  const amountBeforeTax = Math.round(amountAfterTax / (1 + vatRate / 100));
  const vatAmount = amountAfterTax - amountBeforeTax;

  return {
    quantity,
    unitPriceBeforeTax,
    unitPriceAfterTax,
    vatRate,
    discount: discountAmount,
    amountBeforeTax,
    vatAmount,
    amountAfterTax,
  };
}

/**
 * Tính tiền 1 dòng theo loại thuế: KKKNT không bóc thuế (trước thuế = sau thuế,
 * thuế = 0); VAT dùng computeLineVat như cũ.
 */
export function computeLineVatForKind(
  line: VatLineInput,
  resolved: ResolvedLineVat
): VatLineResult {
  if (resolved.kind === "KKKNT") {
    const quantity = Number(line.quantity);
    const discountAmount = Number(line.discount || 0);
    const unitPriceAfterTax = Number(line.price) - discountAmount;
    const amountAfterTax = Math.round(unitPriceAfterTax * quantity);
    return {
      quantity,
      unitPriceBeforeTax: unitPriceAfterTax,
      unitPriceAfterTax,
      vatRate: 0,
      discount: discountAmount,
      amountBeforeTax: amountAfterTax,
      vatAmount: 0,
      amountAfterTax,
    };
  }
  return computeLineVat(line, resolved.rate ?? MISA_VAT_RATE);
}

export interface InvoiceVatResult {
  lines: VatLineResult[];
  totalPreTax: number;
  totalVat: number;
  totalAfterTax: number;
}

/** Tính VAT cho cả hóa đơn (cộng dồn từng dòng). */
export function computeInvoiceVat(
  lines: VatLineInput[],
  vatRate: number = MISA_VAT_RATE
): InvoiceVatResult {
  const lineResults = lines.map((l) =>
    l.resolvedVat
      ? computeLineVatForKind(l, l.resolvedVat)
      : computeLineVat(l, l.vatRate ?? vatRate)
  );
  let totalPreTax = 0;
  let totalVat = 0;
  let totalAfterTax = 0;
  for (const r of lineResults) {
    totalPreTax += r.amountBeforeTax;
    totalVat += r.vatAmount;
    totalAfterTax += r.amountAfterTax;
  }

  return { lines: lineResults, totalPreTax, totalVat, totalAfterTax };
}
