import { apiClient } from "@/lib/config/api";

/**
 * Shape trả về từ backend `GET /inventories/by-branch`.
 * Tương ứng `prisma.inventory.findMany` ở `inventories.service.ts:getInventoryByBranch`.
 */
export interface InventoryByBranchItem {
  id?: number;
  productId: number;
  branchId: number;
  onHand: number | string;
  damagedQuantity?: number | string;
  nearExpiryQuantity?: number | string;
  productCode?: string;
  productName?: string;
  product?: {
    id: number;
    code: string;
    name: string;
    basePrice?: number | string;
    unit?: string;
    isActive?: boolean;
  };
  branch?: { id: number; name: string };
}

/**
 * Lấy tồn kho của nhiều sản phẩm tại 1 chi nhánh.
 * Endpoint: `GET /api/inventories/by-branch?branchId=X&productIds=1,2,3`
 */
export async function getInventoryByBranch(
  branchId: number,
  productIds?: number[]
): Promise<InventoryByBranchItem[]> {
  const params: Record<string, string> = { branchId: String(branchId) };
  if (productIds && productIds.length > 0) {
    params.productIds = productIds.join(",");
  }
  const data = await apiClient.get<InventoryByBranchItem[]>(
    "/inventories/by-branch",
    params
  );
  return Array.isArray(data) ? data : [];
}

export const inventoryApi = {
  getByBranch: getInventoryByBranch,
};