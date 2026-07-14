import { apiClient } from "@/lib/config/api";

export interface InventoryPromoCheckDetail {
  id: number;
  inventoryPromoCheckId: number;
  productId: number;
  productCode: string;
  productName: string;
  currentOnHand: number;
  currentDamaged: number;
  currentNearExpiry: number;
  previousPromoQuantity: number;
  promoQuantity: number;
  note?: string;
  product?: { id: number; code: string; name: string; unit?: string };
}

export interface InventoryPromoCheck {
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
  details: InventoryPromoCheckDetail[];
}

export interface InventoryPromoChecksResponse {
  data: InventoryPromoCheck[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryPromoCheckQueryParams {
  search?: string;
  branchId?: number;
  branchIds?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateInventoryPromoCheckItem {
  productId: number;
  promoQuantity: number;
  note?: string;
}

export interface CreateInventoryPromoCheckDto {
  branchId: number;
  note?: string;
  items: CreateInventoryPromoCheckItem[];
}

export const inventoryPromoChecksApi = {
  getAll: (
    params?: InventoryPromoCheckQueryParams
  ): Promise<InventoryPromoChecksResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.branchIds) query.append("branchIds", params.branchIds);
    else if (params?.branchId)
      query.append("branchId", params.branchId.toString());
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);
    return apiClient.get(`/inventory-promo-checks?${query.toString()}`);
  },

  getOne: (id: number): Promise<InventoryPromoCheck> => {
    return apiClient.get(`/inventory-promo-checks/${id}`);
  },

  create: (
    data: CreateInventoryPromoCheckDto
  ): Promise<InventoryPromoCheck> => {
    return apiClient.post("/inventory-promo-checks", data);
  },

  cancel: (id: number): Promise<InventoryPromoCheck> => {
    return apiClient.put(`/inventory-promo-checks/${id}/cancel`);
  },
};
