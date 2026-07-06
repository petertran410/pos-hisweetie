import { useQuery } from "@tanstack/react-query";
import { suppliersApi } from "@/lib/api/suppliers";

/**
 * Hook lấy danh sách productId của các sản phẩm có gắn nhà máy (primary/backup)
 * thuộc NCC này. Dùng cho filter chặt trong OrderSupplierForm.
 *
 * - Nếu response.length === 0 → NCC chưa có nhà máy nào gắn SP → không filter
 * - Nếu response.length > 0 → filter chặt → chỉ search được các SP trong danh sách
 */
export function useSupplierProductIdsWithFactory(supplierId?: number) {
  return useQuery({
    queryKey: ["supplier", supplierId, "product-ids-with-factory"],
    queryFn: () => suppliersApi.getProductIdsWithFactory(supplierId!),
    enabled: !!supplierId,
    staleTime: 60_000,
  });
}