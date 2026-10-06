import { apiClient } from "@/lib/config/api";

export type InternalFundTransactionType =
  | "RECEIPT"
  | "EXPENSE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export interface InternalFundTransaction {
  id: number;
  code: string;
  branchId: number;
  branch?: { id: number; name: string } | null;
  transactionType: InternalFundTransactionType;
  amount: number | string;
  occurredAt: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceKey: string;
  approvalRequestId: number | null;
  transferId: number | null;
  status: "POSTED" | "CANCELLED" | string;
  cancelledAt: string | null;
  createdAt: string;
}

export interface InternalFundDailyClosing {
  id: number;
  branchId: number;
  closingDate: string;
  systemOpeningBalance: number | string;
  systemReceipt: number | string;
  systemExpense: number | string;
  systemClosingBalance: number | string;
  actualOpeningBalance: number | string | null;
  actualReceipt: number | string | null;
  actualExpense: number | string | null;
  actualClosingBalance: number | string | null;
  reconciliationStatus: "PENDING" | "MATCHED" | "MISMATCHED" | string;
  notes: string | null;
  snapshot?: Record<string, unknown>;
  log?: unknown[];
  closedBy?: number | null;
  closedAt?: string | null;
}

export interface InternalFundApproval {
  id: number;
  kind: string;
  status: string;
  instanceCode: string | null;
  branchId: number;
  sourceType: string;
  sourceId: number | null;
  updatedAt: string;
  metadata?: {
    classification?: string;
    payer?: unknown;
    occurredAt?: string;
    method?: string;
    cashSource?: string;
    cashSourceLabel?: string;
    amount?: number | string;
    description?: string;
    from?: string;
    to?: string;
    tempAdvance?: string;
    attachments?: Array<{
      code: string;
      url: string | null;
      name: string | null;
      type: string | null;
    }>;
  };
  internalFundTransactions: Array<{
    id: number;
    code: string;
    status: string;
    branch?: { id: number; name: string } | null;
  }>;
  internalFundTransfer?: InternalFundTransfer | null;
}

export interface InternalFundTransfer {
  id: number;
  code: string;
  sourceBranchId: number;
  destinationBranchId: number;
  sourceBranch: { id: number; name: string };
  destinationBranch: { id: number; name: string };
  amount: string | number;
  occurredAt: string;
  description: string | null;
  status: string;
  transactions: InternalFundTransaction[];
  approvalRequest?: { status: string; instanceCode: string | null } | null;
}

export interface InternalFundQuery {
  branchId?: number;
  transactionType?: InternalFundTransactionType | "";
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InternalFundReceiptInput {
  clientUuid: string;
  branchId: number;
  amount: number;
  occurredAt: string;
  description?: string;
  classification?: "OTHER" | "REFUND_ADVANCE" | "INTERNAL_TRANSFER";
  destinationBranchId?: number;
  method?: "cash" | "transfer";
  cashSource?: string;
  attachmentCodes: string[];
  attachmentFiles?: Array<{
    code: string;
    url?: string;
    name?: string;
    type?: string;
  }>;
  payerOpenId?: string;
  tempAdvance?: string;
}

export const internalFundApi = {
  summary: (
    params: InternalFundQuery,
  ): Promise<
    Array<{
      branchId: number;
      opening: string;
      receipt: string;
      expense: string;
      closing: string;
    }>
  > => apiClient.get("/internal-fund/summary", params),
  access: (): Promise<Record<number, string[]>> =>
    apiClient.get("/internal-fund/access"),

  approvals: (
    params: InternalFundQuery,
  ): Promise<{
    data: InternalFundApproval[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get("/internal-fund/approvals", params),

  approval: (id: number): Promise<InternalFundApproval> =>
    apiClient.get(`/internal-fund/approvals/${id}`),

  transfers: (
    params: InternalFundQuery,
  ): Promise<{
    data: InternalFundTransfer[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get("/internal-fund/transfers", params),

  uploadFile: (
    file: File,
    branchId: number,
  ): Promise<{ code: string; url: string; name: string; type: string }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("branchId", String(branchId));
    return apiClient.postForm("/internal-fund/upload-file", form);
  },
  transactions: (
    params?: InternalFundQuery,
  ): Promise<{
    data: InternalFundTransaction[];
    total: number;
    page: number;
    limit: number;
  }> => apiClient.get("/internal-fund/transactions", params),

  createReceiptApproval: (
    payload: InternalFundReceiptInput,
  ): Promise<{ id: number; status: string; instanceCode: string | null }> =>
    apiClient.post("/internal-fund/approvals/receipts", payload),

  postApproval: (
    approvalRequestId: number,
  ): Promise<
    InternalFundTransaction | { transactions: InternalFundTransaction[] }
  > => apiClient.post(`/internal-fund/approvals/${approvalRequestId}/post`),

  postExpense: (
    entryId: number,
    issued = true,
  ): Promise<InternalFundTransaction> =>
    apiClient.post(`/internal-fund/entries/${entryId}/post`, { issued }),

  dailyClosings: (
    params?: InternalFundQuery,
  ): Promise<{
    data: InternalFundDailyClosing[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get("/internal-fund/daily-closings", params),

  dailyClosing: (id: number): Promise<InternalFundDailyClosing> =>
    apiClient.get(`/internal-fund/daily-closings/${id}`),

  closeDay: (payload: {
    branchId: number;
    closingDate: string;
    actualOpeningBalance?: number;
    actualReceipt?: number;
    actualExpense?: number;
    actualClosingBalance?: number;
    notes?: string;
  }): Promise<InternalFundDailyClosing> =>
    apiClient.post("/internal-fund/daily-closings", payload),

  cancelTransfer: (id: number, reason: string): Promise<unknown> =>
    apiClient.put(`/internal-fund/transfers/${id}/cancel`, { reason }),

  cancelTransaction: (id: number, reason: string): Promise<unknown> =>
    apiClient.put(`/internal-fund/transactions/${id}/cancel`, { reason }),

  updateTransaction: (
    id: number,
    description: string,
    reason: string,
  ): Promise<unknown> =>
    apiClient.patch(`/internal-fund/transactions/${id}`, {
      description,
      reason,
    }),
};
