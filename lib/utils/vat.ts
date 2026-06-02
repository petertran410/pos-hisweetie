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

export const MISA_VAT_RATE = 8;

export interface VatLineInput {
  quantity: number | string;
  price: number | string;
  discount?: number | string | null;
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
  const lineResults = lines.map((l) => computeLineVat(l, vatRate));
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
