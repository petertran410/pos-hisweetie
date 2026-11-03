import { priceBooksApi, type PriceBook } from "@/lib/api";

// Bảng giá "riêng" = có nhóm khách cụ thể và/hoặc khách cụ thể.
// Cùng quy tắc với backend (src/price-books/price-book-customer-scope.ts).
export function isRestrictedPriceBook(pb: PriceBook) {
  return (
    (!pb.forAllCusGroup && (pb.priceBookCustomerGroups?.length ?? 0) > 0) ||
    (!pb.forAllCustomer && (pb.priceBookCustomers?.length ?? 0) > 0)
  );
}

// Khách có dùng được bảng giá này không (null/0 = Bảng giá chung).
// Khách đã gắn bảng giá riêng chỉ dùng được đúng các bảng giá đó.
export async function canCustomerUsePriceBook(params: {
  customerId: number;
  priceBookId: number | null;
  branchId?: number;
  userId?: number;
}) {
  const usable = await priceBooksApi.getApplicablePriceBooks({
    branchId: params.branchId,
    userId: params.userId,
    customerId: params.customerId,
  });
  if (!params.priceBookId) return !usable.some(isRestrictedPriceBook);
  return usable.some((pb) => pb.id === params.priceBookId);
}
