import { apiClient } from "@/lib/config/api";
import type { Consignment, ConsignmentFilters } from "../types/consignment";
import { CONSIGNMENT_STATUS_KEY } from "../types/consignment";

// BE nhận field `statuses: string[]` (string key), không phải `status: number[]`.
// Map tại ranh giới API để FE giữ nguyên kiểu number[] ở UI/state.
const mapStatusFilter = (params?: ConsignmentFilters) => {
  if (!params) return params;
  const { status, ...rest } = params;
  if (status && status.length > 0) {
    return {
      ...rest,
      statuses: status
        .map((s) => CONSIGNMENT_STATUS_KEY[s])
        .filter(Boolean),
    };
  }
  return rest;
};

export const consignmentsApi = {
  getAll: async (params?: ConsignmentFilters) => {
    return apiClient.get<{
      data: Consignment[];
      total: number;
      page: number;
      limit: number;
    }>("/consignments", mapStatusFilter(params));
  },

  getTotals: async (params?: ConsignmentFilters) => {
    return apiClient.get<{
      count: number;
      totalAmount: number;
      grandTotal: number;
    }>("/consignments/totals", mapStatusFilter(params));
  },

  getById: async (id: number) => {
    return apiClient.get<Consignment>(`/consignments/${id}`);
  },

  create: async (data: any) => {
    return apiClient.post<Consignment>("/consignments", data);
  },

  update: async (id: number, data: any) => {
    return apiClient.put<Consignment>(`/consignments/${id}`, data);
  },

  /** B2 — danh sách phiếu ký gửi đủ điều kiện xử lý kho (cho bao-don). */
  getForPacking: async (params?: {
    branchId?: number;
    pageSize?: number;
    search?: string;
  }) => {
    return apiClient.get<{
      data: Array<{
        id: number;
        code: string;
        branchId: number;
        grandTotal: number;
        consignDate: string;
        status: number;
        statusValue?: string;
        customer: { id: number; name: string } | null;
      }>;
      total: number;
      page: number;
      limit: number;
    }>("/consignments/for-packing", params);
  },

  cancel: async (id: number, reason?: string) => {
    return apiClient.put<{ message: string }>(`/consignments/${id}/cancel`, {
      reason,
    });
  },

  /** B3 — xuất hóa đơn từ phiếu ký gửi (hỗ trợ xuất từng phần). */
  createInvoiceFromConsignment: async (consignmentId: number, data: any) => {
    return apiClient.post(`/invoices/from-consignment/${consignmentId}`, data);
  },

  /**
   * Tổng số lượng đang ký gửi tại khách (đã giao, chưa xuất HĐ) theo product.
   * Trả về { [productId]: quantity }. Dùng cho cột "Ký gửi".
   */
  getConsignmentSummary: (
    productIds: number[],
    branchId?: number
  ): Promise<Record<number, number>> => {
    if (!productIds || productIds.length === 0) return Promise.resolve({});
    const params: Record<string, any> = { productIds: productIds.join(",") };
    if (branchId) params.branchId = branchId;
    return apiClient.get(`/consignments/consignment-summary`, params);
  },

  /** Danh sách phiếu ký gửi đang còn hàng tại khách cho 1 product (modal). */
  getConsignmentByProduct: (
    productId: number,
    branchId?: number
  ): Promise<
    Array<{
      consignmentId: number;
      code: string;
      consignDate: string;
      createdAt: string;
      grandTotal: number;
      status: number;
      statusValue: string;
      consignStatus: string;
      quantity: number;
      customer: { id: number; code?: string | null; name: string } | null;
      creator: { id: number; name: string | null } | null;
      branch: { id: number; name: string } | null;
    }>
  > => {
    const params: Record<string, any> = { productId };
    if (branchId) params.branchId = branchId;
    return apiClient.get(`/consignments/consignment-by-product`, params);
  },
};
