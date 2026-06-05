import { useMemo } from "react";
import { usePriceBookProducts } from "./usePriceBooks";
import { INVOICE_STATUS } from "@/lib/types/invoice";
import type { Invoice, InvoiceDetail } from "@/lib/types/invoice";
import type { PriceBookDetail } from "@/lib/api/price-books";

/** Các bảng giá cần đối chiếu cảnh báo lệch giá. */
const WATCHED_PRICE_BOOK_IDS = [2, 3] as const;

type PriceMap = Record<number, number>;

/**
 * Build Map<productId, price niêm yết> từ danh sách priceBookDetails.
 */
function buildPriceMap(details: PriceBookDetail[] | undefined): PriceMap {
  const map: PriceMap = {};
  (details || []).forEach((detail) => {
    const productId = Number(detail.productId ?? detail.product?.id);
    const price = Number(detail.price);
    if (Number.isFinite(productId) && Number.isFinite(price)) {
      map[productId] = price;
    }
  });
  return map;
}

/**
 * Xác định 1 hóa đơn có cần cảnh báo lệch giá hay không.
 *
 * Điều kiện cảnh báo:
 * - Hóa đơn dùng bảng giá 2 hoặc 3 (priceBookId).
 * - Hóa đơn KHÔNG ở trạng thái đã hủy.
 * - Có ít nhất 1 dòng sản phẩm mà giá thực bán (price - discount, theo đơn vị)
 *   nhỏ hơn giá niêm yết của sản phẩm đó trong CHÍNH bảng giá của hóa đơn.
 * - Sản phẩm không có trong bảng giá (không có giá niêm yết) thì bỏ qua.
 */
export function invoiceHasPriceBookWarning(
  invoice: Invoice,
  priceMaps: Record<number, PriceMap>
): boolean {
  if (invoice.status === INVOICE_STATUS.CANCELLED) return false;

  const priceBookId = Number(invoice.priceBookId);
  if (priceBookId !== 2 && priceBookId !== 3) return false;

  const priceMap = priceMaps[priceBookId];
  if (!priceMap) return false;

  return (invoice.details || []).some((detail: InvoiceDetail) => {
    const productId = Number(detail.productId ?? detail.product?.id);
    const listedPrice = priceMap[productId];
    if (listedPrice === undefined) return false; // không có giá niêm yết → bỏ qua

    const netPrice = Number(detail.price) - (Number(detail.discount) || 0);
    if (!Number.isFinite(netPrice)) return false;

    return netPrice < listedPrice;
  });
}

/**
 * Trả về Set các invoiceId cần hiển thị cảnh báo lệch giá so với bảng giá 2/3.
 * Tự fetch giá niêm yết của bảng giá 2 và 3 (cache qua React Query) và tính
 * lại khi danh sách hóa đơn hoặc giá niêm yết thay đổi.
 */
export function useInvoicePriceBookWarnings(
  invoices: Invoice[]
): Set<number> {
  const { data: priceBook2 } = usePriceBookProducts(WATCHED_PRICE_BOOK_IDS[0]);
  const { data: priceBook3 } = usePriceBookProducts(WATCHED_PRICE_BOOK_IDS[1]);

  const priceMaps = useMemo(
    () => ({
      2: buildPriceMap(priceBook2),
      3: buildPriceMap(priceBook3),
    }),
    [priceBook2, priceBook3]
  );

  return useMemo(() => {
    const warned = new Set<number>();
    (invoices || []).forEach((invoice) => {
      if (invoiceHasPriceBookWarning(invoice, priceMaps)) {
        warned.add(invoice.id);
      }
    });
    return warned;
  }, [invoices, priceMaps]);
}
