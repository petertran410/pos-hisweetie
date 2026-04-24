import { apiClient } from "@/lib/config/api";
import type { ReturnOrder } from "@/lib/types/return-order";

export interface ReturnOrdersResponse {
  data: ReturnOrder[];
  total: number;
  page: number;
  limit: number;
}

export const returnOrdersApi = {
  getAll: (params?: any): Promise<ReturnOrdersResponse> => {
    return apiClient.get("/return-orders", params);
  },

  getById: (id: number): Promise<ReturnOrder> => {
    return apiClient.get(`/return-orders/${id}`);
  },

  create: (data: any): Promise<ReturnOrder> => {
    return apiClient.post("/return-orders", data);
  },

  confirmStock: (id: number, data: any): Promise<ReturnOrder> => {
    return apiClient.put(`/return-orders/${id}/confirm-stock`, data);
  },

  confirmRefund: (id: number, data: any): Promise<ReturnOrder> => {
    return apiClient.put(`/return-orders/${id}/confirm-refund`, data);
  },

  cancel: (id: number): Promise<ReturnOrder> => {
    return apiClient.put(`/return-orders/${id}/cancel`, {});
  },

  updateStep1: (id: number, data: any): Promise<ReturnOrder> => {
    return apiClient.put(`/return-orders/${id}/update-step1`, data);
  },
};
