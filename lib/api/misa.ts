import { apiClient } from "@/lib/config/api";

export interface MisaVoucherResult {
  success: boolean;
  orgRefId?: string | null;
  message: string;
}

export interface MisaRetryResult {
  success: boolean;
  message: string;
  retriedCount?: number;
}

export interface MisaDictionarySyncResult {
  success: boolean;
  message: string;
  data?: {
    inventoryItems: number;
    stocks: number;
    accountObjects: number;
    organizationUnits: number;
  };
}

export interface MisaEmployee {
  id: string;
  code: string;
  name: string;
}

export interface MisaBulkVoucherResult {
  success: boolean;
  message: string;
  total: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    invoiceCode: string;
    success: boolean;
    orgRefId: string | null;
    message: string;
  }>;
}

export const misaApi = {
  /** Danh sách nhân viên phụ trách (Misa account object, isEmployee = true) */
  getEmployees: (): Promise<MisaEmployee[]> => {
    return apiClient.get(`/misa/employees`);
  },
  /** Đồng bộ toàn bộ danh mục Misa về database */
  syncDictionary: (): Promise<MisaDictionarySyncResult> => {
    return apiClient.post(`/misa/dictionary/sync`);
  },
  /** Đẩy hàng loạt hóa đơn lên Misa theo danh sách mã */
  createVouchersBulk: (
    invoiceCodes: string[]
  ): Promise<MisaBulkVoucherResult> => {
    return apiClient.post(`/misa/voucher/bulk-create`, { invoiceCodes });
  },
  /** Đẩy 1 hóa đơn lên Misa (sinh chứng từ bán hàng) */
  createVoucher: (invoiceCode: string): Promise<MisaVoucherResult> => {
    return apiClient.post(
      `/misa/voucher/create/${encodeURIComponent(invoiceCode)}`
    );
  },
  /** Retry các hóa đơn đẩy Misa bị FAILED */
  retryVouchers: (): Promise<MisaRetryResult> => {
    return apiClient.post(`/misa/voucher/retry`);
  },
  /** Xóa đề nghị sinh chứng từ Misa theo mã hóa đơn */
  deleteVoucher: (
    invoiceCode: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(
      `/misa/voucher/delete/${encodeURIComponent(invoiceCode)}`
    );
  },
};
