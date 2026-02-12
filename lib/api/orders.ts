import { apiClient } from "../config/api";
import { Order } from "../types/order";

export const ordersApi = {
  getOrders: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: number;
    branchId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.customerId)
      queryParams.append("customerId", params.customerId.toString());
    if (params?.branchId)
      queryParams.append("branchId", params.branchId.toString());
    if (params?.fromDate) queryParams.append("fromDate", params.fromDate);
    if (params?.toDate) queryParams.append("toDate", params.toDate);

    return apiClient.get(`/orders?${queryParams.toString()}`);
  },

  getOrder: (id: number): Promise<Order> => {
    return apiClient.get(`/orders/${id}`);
  },

  createOrder: (data: Order): Promise<{ order: Order; warnings: any[] }> => {
    return apiClient.post("/orders", data);
  },

  updateOrder: (id: number, data: Partial<Order>): Promise<Order> => {
    return apiClient.put(`/orders/${id}`, data);
  },

  deleteOrder: (id: number): Promise<void> => {
    return apiClient.delete(`/orders/${id}`);
  },
};
