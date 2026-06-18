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

export interface MisaInventoryItem {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
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

/**
 * Thông tin người mua ghi đè (nhập tay trên giao diện hóa đơn VAT).
 * Chỉ có hiệu lực khi cả 3 trường đều có dữ liệu (backend tự kiểm tra).
 */
export interface MisaBuyerOverride {
  taxCode?: string;
  buyerName?: string;
  buyerAddress?: string;
}

export const misaApi = {
  /** Danh sách nhân viên phụ trách (Misa account object, isEmployee = true) */
  getEmployees: (): Promise<MisaEmployee[]> => {
    return apiClient.get(`/misa/employees`);
  },
  /** Tìm kiếm vật tư hàng hóa Misa để liên kết với sản phẩm */
  searchInventoryItems: (
    search?: string,
    limit = 50
  ): Promise<MisaInventoryItem[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", String(limit));
    return apiClient.get(`/misa/inventory-items?${params.toString()}`);
  },
  /** Đồng bộ toàn bộ danh mục Misa về database */
  syncDictionary: (): Promise<MisaDictionarySyncResult> => {
    return apiClient.post(`/misa/dictionary/sync`);
  },
  /** Đẩy hàng loạt hóa đơn lên Misa theo danh sách mã */
  createVouchersBulk: (
    invoiceCodes: string[],
    buyerOverrides?: Record<string, MisaBuyerOverride>
  ): Promise<MisaBulkVoucherResult> => {
    return apiClient.post(`/misa/voucher/bulk-create`, {
      invoiceCodes,
      ...(buyerOverrides && Object.keys(buyerOverrides).length > 0
        ? { buyerOverrides }
        : {}),
    });
  },
  /** Đẩy 1 hóa đơn lên Misa (sinh chứng từ bán hàng) */
  createVoucher: (
    invoiceCode: string,
    buyerOverride?: MisaBuyerOverride
  ): Promise<MisaVoucherResult> => {
    return apiClient.post(
      `/misa/voucher/create/${encodeURIComponent(invoiceCode)}`,
      buyerOverride ? { buyerOverride } : undefined
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
