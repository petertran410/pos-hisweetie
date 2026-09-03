import { apiClient } from "@/lib/config/api";

export interface ScannedDocument {
  kind: "invoice" | "consignment";
  id: number;
  code: string;
  branchId: number;
  grandTotal: number;
  purchaseDate?: string | null;
  customer?: { id: number; name: string } | null;
}

export const documentsApi = {
  resolveScan: (
    payload: string,
    packingType: "packing-slip" | "packing-hang" | "packing-loading"
  ): Promise<ScannedDocument> =>
    apiClient.post("/invoices/scan-resolve", { payload, packingType }),
};
