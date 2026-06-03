import { useQueries } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";

export interface LatestSalePrices {
  /**
   * Map productId → giá bán gần nhất (finalPrice = price - discount) của
   * cặp khách hàng + sản phẩm. null nếu chưa có lịch sử.
   */
  pricesByProduct: Record<number, number | null>;
  isLoading: boolean;
}

/**
 * Lấy giá bán gần nhất của nhiều sản phẩm cho cùng một khách hàng, chạy song song.
 * - Dedupe productIds để không gọi API trùng cho cùng 1 sản phẩm.
 * - React Query tự dedupe theo queryKey nên nhiều dòng cùng sản phẩm chỉ tốn 1 request.
 * - Mặc định so sánh theo lịch sử "invoice" (giá thực bán gần nhất).
 * - Lọc theo branchId (chi nhánh đang chọn) khi được truyền vào.
 */
export function useLatestSalePrices(
  customerId: number | undefined,
  productIds: number[],
  type: "order" | "invoice" = "invoice",
  branchId?: number
): LatestSalePrices {
  const uniqueProductIds = Array.from(
    new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))
  );

  const results = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: [
        "product-price-history",
        customerId,
        productId,
        type,
        branchId ?? null,
      ],
      queryFn: () =>
        ordersApi.getProductPriceHistory(
          customerId!,
          productId,
          type,
          branchId
        ),
      enabled: !!customerId && !!productId,
      staleTime: 30_000,
    })),
  });

  const pricesByProduct: Record<number, number | null> = {};
  uniqueProductIds.forEach((productId, index) => {
    const history = results[index]?.data;
    // Backend trả mảng đã sort theo ngày desc → phần tử đầu là gần nhất.
    pricesByProduct[productId] =
      history && history.length > 0 ? history[0].finalPrice : null;
  });

  const isLoading = results.some((r) => r.isLoading);

  return { pricesByProduct, isLoading };
}
