import { useQuery } from "@tanstack/react-query";
import { orderSuppliersApi } from "../api/order-suppliers";

export interface LatestSupplierPrices {
  /**
   * Map productId → giá nhập gần nhất (cột price, không trừ giảm giá) của
   * cặp nhà cung cấp + sản phẩm. null nếu chưa có lịch sử.
   */
  pricesByProduct: Record<number, number | null>;
  isLoading: boolean;
}

/**
 * Lấy giá đặt hàng nhập gần nhất của nhiều sản phẩm theo MỘT nhà cung cấp.
 * - Dedupe productIds.
 * - Loại trừ phiếu Đã hủy (xử lý ở backend).
 * - branchId: dùng cho fallback giá vốn khi SP chưa có lịch sử với NCC này.
 * - Không gate quyền — endpoint trả giá nền cho mọi user; chỉ tầng render cột
 *   mới ẩn theo `order_suppliers:view_price`.
 * - enabled chỉ khi có supplierId và ít nhất 1 productId hợp lệ.
 */
export function useLatestSupplierPrices(
  supplierId: number | undefined,
  productIds: number[],
  branchId?: number
): LatestSupplierPrices {
  const ids = Array.from(
    new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))
  );

  const { data, isLoading } = useQuery({
    queryKey: [
      "order-supplier-latest-prices",
      supplierId ?? null,
      [...ids].sort((a, b) => a - b).join(","),
      branchId ?? null,
    ],
    queryFn: () =>
      orderSuppliersApi.getLatestSupplierPrices(supplierId!, ids, branchId),
    enabled: !!supplierId && ids.length > 0,
    staleTime: 30_000,
  });

  return { pricesByProduct: data ?? {}, isLoading };
}
