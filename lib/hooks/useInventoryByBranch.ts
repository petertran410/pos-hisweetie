import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  inventoryApi,
  type InventoryByBranchItem,
} from "@/lib/api/inventory";

/**
 * Lấy tồn kho realtime theo (productIds, branchId) từ
 * `GET /api/inventories/by-branch?branchId=X&productIds=...`.
 *
 * Trả về `Map<productId, onHand>` để tra cứu O(1) khi render.
 *
 * Cache key đã sort productIds + branchId nên đổi thứ tự id không tạo cache mới.
 * Hook sẽ tự refetch khi:
 *  - user reload trang (cache reset → fetch lại)
 *  - user đổi `selectedBranch` (key đổi → fetch lại)
 *  - thêm/xóa sản phẩm trong giỏ (productIds thay đổi → key đổi → fetch lại)
 */
export function useInventoryByBranch(
  productIds: number[],
  branchId?: number
): {
  inventoryMap: Map<number, number>;
  isLoading: boolean;
  data: InventoryByBranchItem[] | undefined;
} {
  const sortedKey = useMemo(
    () => [...productIds].sort((a, b) => a - b).join(","),
    [productIds]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-by-branch", sortedKey, branchId ?? null],
    queryFn: () => inventoryApi.getByBranch(branchId!, productIds),
    enabled: productIds.length > 0 && !!branchId,
  });

  const inventoryMap = useMemo(() => {
    const m = new Map<number, number>();
    if (!data) return m;
    for (const item of data) {
      m.set(item.productId, Number(item.onHand) || 0);
    }
    return m;
  }, [data]);

  return { inventoryMap, isLoading, data };
}