import { apiClient } from "@/lib/config/api";
import type {
  OrderSupplier,
  OrderSupplierFilters,
  OrderSupplierPayment,
} from "../types/order-supplier";

export const orderSuppliersApi = {
  getAll: async (params?: OrderSupplierFilters) => {
    const response = await apiClient.get<{
      data: OrderSupplier[];
      total: number;
      page: number;
      limit: number;
    }>("/order-suppliers", params);
    return response;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<OrderSupplier>(
      `/order-suppliers/${id}`
    );
    return response;
  },

  create: async (data: any) => {
    const response = await apiClient.post<OrderSupplier>(
      "/order-suppliers",
      data
    );
    return response;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<OrderSupplier>(
      `/order-suppliers/${id}`,
      data
    );
    return response;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/order-suppliers/${id}`);
    return response;
  },

  getPayments: async (orderSupplierId: number) => {
    const response = await apiClient.get<OrderSupplierPayment[]>(
      `/order-suppliers/${orderSupplierId}/payments`
    );
    return response;
  },
};
