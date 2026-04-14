import { apiClient } from "@/lib/config/api";

export interface PackingCheckResult {
  invoiceId: number;
  code: string;
}

export const packingChecksApi = {
  checkDongHang: (invoiceIds: number[]): Promise<PackingCheckResult[]> =>
    apiClient.post("/packing-hangs/check-invoices", { invoiceIds }),

  checkLoading: (invoiceIds: number[]): Promise<PackingCheckResult[]> =>
    apiClient.post("/packing-loadings/check-invoices", { invoiceIds }),

  checkGiaoHang: (invoiceIds: number[]): Promise<PackingCheckResult[]> =>
    apiClient.post("/packing-slips/check-invoices", { invoiceIds }),
};
