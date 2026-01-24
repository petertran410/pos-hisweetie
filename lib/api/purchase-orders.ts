import { apiClient } from "@/lib/config/api";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
} from "../types/purchase-order";

export const purchaseOrdersApi = {
  getAll: async (params?: PurchaseOrderFilters) => {
    const response = await apiClient.get<{
      data: PurchaseOrder[];
      total: number;
      page: number;
      limit: number;
    }>("/purchase-orders", params);
    return response;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<PurchaseOrder>(
      `/purchase-orders/${id}`
    );
    return response;
  },

  create: async (data: any) => {
    const response = await apiClient.post<PurchaseOrder>(
      "/purchase-orders",
      data
    );
    return response;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<PurchaseOrder>(
      `/purchase-orders/${id}`,
      data
    );
    return response;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/purchase-orders/${id}`);
    return response;
  },
};
