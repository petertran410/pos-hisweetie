import { apiClient } from "./client";
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
    }>("/purchase-orders", { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<PurchaseOrder>(
      `/purchase-orders/${id}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<PurchaseOrder>(
      "/purchase-orders",
      data
    );
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<PurchaseOrder>(
      `/purchase-orders/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/purchase-orders/${id}`);
    return response.data;
  },
};
