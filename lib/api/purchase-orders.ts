import { apiClient } from "@/lib/config/api";

export const purchaseOrdersApi = {
  getAll: (params?: any) => apiClient.get("/purchase-orders", { params }),
  getById: (id: number) => apiClient.get(`/purchase-orders/${id}`),
  create: (data: any) => apiClient.post("/purchase-orders", data),
  createFromOrderSupplier: (
    orderSupplierId: number,
    additionalPayment?: number
  ) =>
    apiClient.post(`/purchase-orders/from-order-supplier/${orderSupplierId}`, {
      additionalPayment,
    }),
  update: (id: number, data: any) =>
    apiClient.put(`/purchase-orders/${id}`, data),
  delete: (id: number) => apiClient.delete(`/purchase-orders/${id}`),
};
