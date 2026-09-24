"use client";

import { usePermission } from "@/lib/hooks/usePermissions";

/**
 * Ẩn/hiện giá vốn trên trang Xuất dùng nội bộ.
 *
 * Trang này từng chỉ check `internal-use:view_cost_price` (quyền riêng của
 * module). Quyền "Xem giá vốn" mà admin hay tắt trên giao diện phân quyền lại
 * là `products:view_cost_price`. User tắt quyền sản phẩm nhưng vẫn còn quyền
 * module (seed cũ từng gán sẵn) thì giá vốn vẫn hiện.
 *
 * Cần cả hai quyền. Super Admin vẫn bypass qua useCan.
 */
export function useCanViewInternalUseCost(): boolean {
  const canViewModuleCost = usePermission("internal-use", "view_cost_price");
  const canViewProductCost = usePermission("products", "view_cost_price");
  return canViewModuleCost && canViewProductCost;
}
