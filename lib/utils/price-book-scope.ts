import { priceBooksApi, type PriceBook } from "@/lib/api";

// Bảng giá "riêng" = có nhóm khách cụ thể và/hoặc khách cụ thể.
// Cùng quy tắc với backend (src/price-books/price-book-customer-scope.ts).
export function isRestrictedPriceBook(pb: PriceBook) {
  return (
    (!pb.forAllCusGroup && (pb.priceBookCustomerGroups?.length ?? 0) > 0) ||
    (!pb.forAllCustomer && (pb.priceBookCustomers?.length ?? 0) > 0)
  );
}

// Khách có thuộc bảng giá này không (null/0 = Bảng giá chung).
// Khách đã gắn bảng giá riêng chỉ thuộc đúng các bảng giá đó.
// ownPriceBooks: các bảng giá riêng khách đang thuộc (để hiện tên).
export async function canCustomerUsePriceBook(params: {
  customerId: number;
  priceBookId: number | null;
  branchId?: number;
  userId?: number;
}): Promise<{ allowed: boolean; ownPriceBooks: PriceBook[] }> {
  const usable = await priceBooksApi.getApplicablePriceBooks({
    branchId: params.branchId,
    userId: params.userId,
    customerId: params.customerId,
  });
  const ownPriceBooks = usable.filter(isRestrictedPriceBook);
  const allowed = params.priceBookId
    ? usable.some((pb) => pb.id === params.priceBookId)
    : ownPriceBooks.length === 0;
  return { allowed, ownPriceBooks };
}
