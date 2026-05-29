import { apiClient } from "@/lib/config/api";

export interface InventoryCheckDetail {
  id: number;
  inventoryCheckId: number;
  productId: number;
  productCode: string;
  productName: string;
  currentOnHand: number;
  previousDamaged: number;
  previousNearExpiry: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  note?: string;
  product?: { id: number; code: string; name: string; unit?: string };
}

export interface InventoryCheck {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  checkDate: string;
  note?: string;
  status: number;
  createdById: number;
  createdByName: string;
  createdAt: string;
  branch?: { id: number; name: string; isActive: boolean };
  creator?: { id: number; name: string };
  details: InventoryCheckDetail[];
}

export interface InventoryChecksResponse {
  data: InventoryCheck[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryCheckQueryParams {
  search?: string;
  branchId?: number;
  branchIds?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateInventoryCheckItem {
  productId: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  note?: string;
}

export interface CreateInventoryCheckDto {
  branchId: number;
  note?: string;
  items: CreateInventoryCheckItem[];
}

export const inventoryChecksApi = {
  getAll: (
    params?: InventoryCheckQueryParams
  ): Promise<InventoryChecksResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.branchIds) query.append("branchIds", params.branchIds);
    else if (params?.branchId)
      query.append("branchId", params.branchId.toString());
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);
    return apiClient.get(`/inventory-checks?${query.toString()}`);
  },

  getOne: (id: number): Promise<InventoryCheck> => {
    return apiClient.get(`/inventory-checks/${id}`);
  },

  create: (data: CreateInventoryCheckDto): Promise<InventoryCheck> => {
    return apiClient.post("/inventory-checks", data);
  },

  cancel: (id: number): Promise<InventoryCheck> => {
    return apiClient.put(`/inventory-checks/${id}/cancel`);
  },
};
