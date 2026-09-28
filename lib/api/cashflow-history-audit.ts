import { apiClient } from "@/lib/config/api";

export interface CashFlowHistoryCandidate {
  id: number;
  code: string;
  amount: number | string;
  transDate: string;
  description: string | null;
}

export interface CashFlowHistoryAuditRow {
  sourceRecordId: string | null;
  code: string | null;
  branchName: string;
  branchId: number | null;
  isReceipt: boolean;
  amount: number;
  transDate: string | null;
  description: string | null;
  type: string | null;
  canceled: boolean;
  candidates: CashFlowHistoryCandidate[];
}

export interface CashFlowHistoryAuditResponse {
  data: CashFlowHistoryAuditRow[];
  nextPageToken: string | null;
  hasMore: boolean;
}

export interface CashFlowHistoryImportResult {
  created: Array<{ recordId: string; cashFlowId: number; code: string }>;
  skipped: Array<{ recordId: string; reason: string }>;
}

export const cashFlowHistoryAuditApi = {
  preview: (params?: {
    pageToken?: string;
    pageSize?: number;
  }): Promise<CashFlowHistoryAuditResponse> =>
    apiClient.get("/cashflows/lark-history/preview", params),
  import: (
    recordIds: string[],
    confirm = true
  ): Promise<CashFlowHistoryImportResult> =>
    apiClient.post("/cashflows/lark-history/import", { recordIds, confirm }),
};
