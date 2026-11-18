import { apiClient } from "@/lib/config/api";

/** Quyền của user với quỹ tiền mặt VPSG và các tài khoản ngân hàng của quỹ. */
export interface VpsgCashAccess {
  accountNumbers: string[];
  canView: boolean;
  canRecord: boolean;
  canCancel: boolean;
  /** Ngày quỹ VPSG lên POS: giao dịch trước ngày này không ghi được. */
  fundStart: string;
}

/** Dòng THU đã ghi vào quỹ VPSG cho một giao dịch ngân hàng. */
export interface VpsgCashRecord {
  transactionId: number;
  fundTransactionId: number;
  code: string;
  amount: string;
  occurredAt: string;
  recordedAt: string;
  recordedBy: { id: number; name: string } | null;
}

export const vpsgCashApi = {
  access: (): Promise<VpsgCashAccess> => apiClient.get(`/vpsg-cash/accounts`),
  records: (ids: number[]): Promise<VpsgCashRecord[]> =>
    apiClient.get(`/vpsg-cash/records`, { ids: ids.join(",") }),
  record: (id: number) =>
    apiClient.post(`/vpsg-cash/transactions/${id}/record`),
  cancel: (id: number, reason: string) =>
    apiClient.post(`/vpsg-cash/transactions/${id}/cancel`, { reason }),
};
