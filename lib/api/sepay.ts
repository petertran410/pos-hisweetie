import { apiClient } from "@/lib/config/api";

export interface SepaySyncResult {
  fetched: number;
  created: number;
  updated: number;
  pages: number;
}

export interface SepaySyncResponse {
  success: boolean;
  result: SepaySyncResult;
  timestamp: string;
}

export interface SepayMatchInfo {
  status: "processing" | "assigned" | "completed";
  completedSource: "webhook" | "manual" | null;
  customer: { id: number; code: string | null; name: string } | null;
  cashFlow: { id: number; code: string } | null;
  refCode: string | null;
}

export interface SepayTransaction {
  id: number;
  sepayId: string;
  transactionDate: string | null;
  accountNumber: string | null;
  subAccount: string | null;
  amountIn: string;
  amountOut: string;
  accumulated: string | null;
  code: string | null;
  transactionContent: string | null;
  referenceNumber: string | null;
  bankBrandName: string | null;
  bankAccountId: string | null;
  assignedCustomerId: number | null;
  assignedCustomerName: string | null;
  cashFlowId: number | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
  match: SepayMatchInfo | null;
}

export interface SepayTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  accountNumber?: string;
  transferType?: "in" | "out";
  dateFrom?: string;
  dateTo?: string;
  status?: "processing" | "assigned" | "completed";
}

export interface SepayTransactionsResponse {
  data: SepayTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const sepayApi = {
  /** Đồng bộ toàn bộ lịch sử giao dịch Sepay về bảng riêng (không tạo phiếu thu) */
  syncTransactions: (): Promise<SepaySyncResponse> => {
    return apiClient.post(`/sepay/sync`);
  },
  /** Danh sách giao dịch Sepay đã đồng bộ (biến động số dư) */
  getTransactions: (
    params?: SepayTransactionsParams
  ): Promise<SepayTransactionsResponse> => {
    return apiClient.get(`/sepay/transactions`, params);
  },
  /** Sale gán khách hàng cho 1 giao dịch */
  assignCustomer: (
    id: number,
    customerId: number
  ): Promise<{
    success: boolean;
    customer: { id: number; code: string; name: string };
  }> => {
    return apiClient.put(`/sepay/transactions/${id}/assign`, { customerId });
  },
  /** Bỏ gán khách hàng (chỉ khi chưa tạo phiếu thu) */
  unassignCustomer: (id: number): Promise<{ success: boolean }> => {
    return apiClient.delete(`/sepay/transactions/${id}/assign`);
  },
  /** Kế toán xác nhận & tạo phiếu thu từ giao dịch */
  confirmReceipt: (
    id: number,
    data: { branchId: number; collectorUserId?: number; description?: string }
  ): Promise<{ success: boolean; cashFlow: { id: number; code: string } | null }> => {
    return apiClient.post(`/sepay/transactions/${id}/confirm`, data);
  },
  /** Tổng hợp giao dịch cần xử lý (cho thông báo sale) */
  getPendingSummary: (): Promise<{
    count: number;
    latestId: number | null;
    latest: {
      amountIn: string;
      accountNumber: string | null;
      bankBrandName: string | null;
    } | null;
  }> => {
    return apiClient.get(`/sepay/transactions/pending`);
  },
};
