import { invoicesApi } from "@/lib/api/invoices";
import { ordersApi } from "@/lib/api/orders";
import { productsApi } from "@/lib/api/products";
import { priceBooksApi } from "@/lib/api/price-books";
import { debtTrackingApi } from "@/lib/api/debt-tracking";
import { smaxChatApi } from "@/lib/api/smaxChat";
import type { ChatContext } from "@/lib/types/smaxChat";
import type { CartLine } from "@/lib/store/posInView";
import { cartText, debtText, invoiceText, orderText, productText } from "./quickTemplates";

/** Mục gửi nhanh chọn từ menu "/" hoặc kéo từ bảng Thông tin POS. */
export type QuickItem =
  | { type: "invoice" | "order" | "product"; id: number }
  | { type: "cart"; lines: CartLine[] }
  | { type: "debt" };

export interface QuickPerms {
  canViewDebt: boolean;
  canViewDebtTracking: boolean;
  canViewSalePrice: boolean;
  canViewPriceBooks: boolean;
  canViewStock: boolean;
}

export interface ProductImagePick {
  productId: number;
  name: string;
  images: { id: number; url: string }[];
}

export interface QuickResult {
  text: string;
  qrImageUrl?: string;
  // Ảnh của sản phẩm vừa chèn — cho người dùng tick chọn gửi kèm
  productImages?: ProductImagePick;
}

/** Tải dữ liệu đầy đủ của mục và dựng tin (quyền POS do chính các API kiểm tra). */
export async function buildQuickMessage(
  item: QuickItem,
  ctx: ChatContext,
  perms: QuickPerms,
  branchId: number | undefined
): Promise<QuickResult> {
  switch (item.type) {
    case "invoice":
      return { text: invoiceText(await invoicesApi.getInvoice(item.id), perms.canViewDebt) };
    case "order":
      return { text: orderText(await ordersApi.getOrder(item.id), perms.canViewDebt) };
    case "cart":
      return { text: cartText(item.lines, perms.canViewSalePrice) };
    case "product": {
      const product = await productsApi.getProduct(item.id);
      let price: number | null = null;
      if (perms.canViewSalePrice) {
        price = Number(product.basePrice ?? 0);
        if (perms.canViewPriceBooks) {
          // Bảng giá áp dụng cho khách đang chat — như khi lên đơn ở /ban-hang
          const info = await priceBooksApi
            .getPriceForProduct({ productId: item.id, branchId, customerId: ctx.customer.id })
            .catch(() => null);
          if (info?.price != null) price = Number(info.price);
        }
      }
      const inv = branchId ? product.inventories?.find((i) => i.branchId === branchId) : undefined;
      const inStock =
        perms.canViewStock && inv ? Number(inv.onHand ?? 0) - Number(inv.reserved ?? 0) > 0 : null;
      const images = (product.images ?? [])
        .filter((i) => /^https:\/\//.test(i.image))
        .map((i) => ({ id: i.id, url: i.image }));
      return {
        text: productText({ name: product.name, code: product.code, unit: product.unit, price, inStock }),
        productImages: images.length ? { productId: product.id, name: product.name, images } : undefined,
      };
    }
    case "debt": {
      if (ctx.debt === null) throw new Error("Bạn không có quyền xem công nợ");
      const [detail, payment] = await Promise.all([
        perms.canViewDebtTracking
          ? debtTrackingApi.getDetail(ctx.customer.id).catch(() => null)
          : Promise.resolve(null),
        smaxChatApi.getPaymentInfo(ctx.customer.id).catch(() => null),
      ]);
      const debt = detail
        ? {
            total: Number(detail.aging.totalDebt),
            overdue: Number(detail.aging.overdueAmount) || null,
            invoices: detail.aging.outstandingInvoices.map((i) => ({
              code: i.code,
              date: i.purchaseDate,
              outstanding: Number(i.outstanding),
              daysOverdue: i.daysOverdue,
            })),
          }
        : {
            total: ctx.debt,
            overdue: null,
            invoices: ctx.recentInvoices
              .filter((i) => i.debt > 0)
              .map((i) => ({ code: i.code, date: i.date, outstanding: i.debt })),
          };
      return {
        text: debtText(ctx.customer, debt, payment?.bank ?? null),
        qrImageUrl: payment?.bank && debt.total > 0 ? payment.qrUrl ?? undefined : undefined,
      };
    }
  }
}

export const QUICK_ITEM_MIME = "application/x-pos-quick-item";
