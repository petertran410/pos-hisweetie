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

  cancel: async (id: number, cancelPayments: boolean) => {
    const response = await apiClient.put<{ message: string }>(
      `/order-suppliers/${id}/cancel`,
      { cancelPayments }
    );
    return response;
  },

  getPayments: async (orderSupplierId: number) => {
    const response = await apiClient.get<OrderSupplierPayment[]>(
      `/order-suppliers/${orderSupplierId}/payments`
    );
    return response;
  },

  /**
   * Tổng số "Đặt NCC" cho từng sản phẩm — chỉ tính các phiếu OrderSupplier
   * ở trạng thái Đã xác nhận NCC (1) hoặc Nhập một phần (2).
   * Truyền branchId nếu muốn lọc theo chi nhánh, không truyền thì lấy mọi chi nhánh.
   * Trả về object: { [productId]: totalQuantity }
   */
  getConfirmedSummary: (
    productIds: number[],
    branchId?: number
  ): Promise<Record<number, number>> => {
    if (!productIds || productIds.length === 0) {
      return Promise.resolve({});
    }
    const params: Record<string, any> = { productIds: productIds.join(",") };
    if (branchId) params.branchId = branchId;
    return apiClient.get(`/order-suppliers/confirmed-summary`, params);
  },

  /**
   * Danh sách phiếu đặt hàng nhập (Đã xác nhận NCC / Nhập một phần)
   * chứa sản phẩm cụ thể. Truyền branchId để lọc theo chi nhánh đang chọn.
   * Dùng cho modal khi click vào số "Đặt NCC".
   */
  getConfirmedByProduct: (
    productId: number,
    branchId?: number
  ): Promise<
    Array<{
      orderSupplierId: number;
      code: string;
      createdAt: string;
      orderDate: string;
      total: number;
      status: number;
      statusValue: string;
      quantity: number;
      supplier: { id: number; code?: string | null; name: string } | null;
      creator: { id: number; name: string | null } | null;
      branch: { id: number; name: string } | null;
    }>
  > => {
    const params: Record<string, any> = { productId };
    if (branchId) params.branchId = branchId;
    return apiClient.get(`/order-suppliers/confirmed-by-product`, params);
  },
};
