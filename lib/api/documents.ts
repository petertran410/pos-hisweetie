import { apiClient } from "@/lib/config/api";
import type { ColdCargoItem } from "@/lib/types/cold-cargo-warning";

export interface ScannedDocument {
  kind: "invoice" | "consignment";
  id: number;
  code: string;
  branchId: number;
  grandTotal: number;
  purchaseDate?: string | null;
  customer?: { id: number; name: string } | null;
  hasColdItems?: boolean;
  coldItemCount?: number;
  coldItems?: ColdCargoItem[];
}

export const documentsApi = {
  resolveScan: (
    payload: string,
    packingType: "packing-slip" | "packing-hang" | "packing-loading"
  ): Promise<ScannedDocument> =>
    apiClient.post("/invoices/scan-resolve", { payload, packingType }),
};
