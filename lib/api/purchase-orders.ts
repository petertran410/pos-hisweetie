import { apiClient } from "@/lib/config/api";

export const purchaseOrdersApi = {
  getAll: (params?: any) => apiClient.get("/purchase-orders", params),
  getById: (id: number) => apiClient.get(`/purchase-orders/${id}`),
  create: (data: any) => apiClient.post("/purchase-orders", data),
  createFromOrderSupplier: (
    orderSupplierId: number,
    payload: {
      additionalPayment?: number;
      items?: any[];
      payments?: Array<{
        method: string;
        amount: number;
        accountId?: number;
        exchangeRate?: number;
        foreignAmount?: number;
      }>;
      branchId?: number;
      purchaseDate?: string;
      discount?: number;
      discountRatio?: number;
      isDraft?: boolean;
      partnerType?: string;
      description?: string;
      purchaseById?: number;
    } = {}
  ) =>
    apiClient.post(`/purchase-orders/from-order-supplier/${orderSupplierId}`, {
      additionalPayment: payload.additionalPayment || 0,
      items: payload.items || [],
      payments: payload.payments || [],
      ...(payload.branchId ? { branchId: payload.branchId } : {}),
      ...(payload.purchaseDate ? { purchaseDate: payload.purchaseDate } : {}),
      ...(payload.discount !== undefined ? { discount: payload.discount } : {}),
      ...(payload.discountRatio !== undefined
        ? { discountRatio: payload.discountRatio }
        : {}),
      ...(payload.isDraft !== undefined ? { isDraft: payload.isDraft } : {}),
      ...(payload.partnerType ? { partnerType: payload.partnerType } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.purchaseById ? { purchaseById: payload.purchaseById } : {}),
    }),
  update: (id: number, data: any) =>
    apiClient.put(`/purchase-orders/${id}`, data),
  cancel: (id: number, data?: { cancelPayments?: boolean }) =>
    apiClient.put(`/purchase-orders/${id}/cancel`, data || {}),
  delete: (id: number) => apiClient.delete(`/purchase-orders/${id}`),
};
