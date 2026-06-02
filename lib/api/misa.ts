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

export const misaApi = {
  /** Đồng bộ toàn bộ danh mục Misa về database */
  syncDictionary: (): Promise<MisaDictionarySyncResult> => {
    return apiClient.post(`/misa/dictionary/sync`);
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
