import { apiClient } from "@/lib/config/api";

export type CashAdvanceStatus =
  "DRAFT" | "CONFIRMING" | "COMPLETED" | "CANCELLED";

export type CashAdvancePeriodMode = "WEEK" | "RANGE";

export interface CashAdvanceAttachment {
  id?: number;
  kind?: "INITIAL" | "SIGNED" | string;
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt?: string;
}

type UserRef = { id: number; name: string } | null;

export interface CashAdvanceFundRow {
  id: number;
  code: string;
  status: string;
  amount: number | string;
  occurredAt: string;
}

/** Đối chiếu tạm ứng với phiếu chi kho trong kỳ. */
export interface CashAdvanceUsage {
  amount: number;
  refunded: number;
  /** Phiếu chi đã Đã chi từ tạm ứng (đã chốt). */
  locked: number;
  /** Phiếu chi chưa Đã chi dự kiến trừ vào tạm ứng. */
  projected: number;
  used: number;
  remaining: number;
  maxRefund: number;
  suggestedRefund: number;
}

export interface CashAdvance {
  id: number;
  code: string;
  branchId: number;
  branch?: UserRef;
  recipientId: number;
  recipient: { id: number; name: string };
  amount: number;
  /** Ngày dạng yyyy-mm-dd. */
  advanceDate: string;
  periodMode: CashAdvancePeriodMode;
  periodYear: number | null;
  periodWeek: number | null;
  periodFrom: string;
  periodTo: string;
  refundDueDate: string;
  periodLabel: string;
  description: string;
  status: CashAdvanceStatus;
  confirmedAt: string | null;
  confirmer?: UserRef;
  completedAt: string | null;
  completer?: UserRef;
  cancelledAt: string | null;
  canceller?: UserRef;
  cancelReason: string | null;
  createdBy: number;
  creator?: UserRef;
  createdAt: string;
  attachments: CashAdvanceAttachment[];
  refunds: Array<{
    id: number;
    code: string;
    amount: number;
    status: CashAdvanceStatus;
    refundDate: string;
  }>;
  usage: CashAdvanceUsage;
  /** Tổng phiếu chi kho của kho trong kỳ (mọi người chi). */
  totalInPeriod: number;
  expenseCountInPeriod: number;
  /** Hết kỳ, còn tiền chưa dùng, chưa có hoàn ứng. */
  needsRefund: boolean;
  /** Quá hạn hoàn ứng (hết kỳ + 5 ngày): chặn tạm ứng mới của người nhận. */
  overdue: boolean;
  fundTransaction: CashAdvanceFundRow | null;
}

export interface CashAdvanceExpenseRow {
  id: number;
  code: string;
  occurredAt: string;
  description: string | null;
  amount: number;
  /** Phần của phiếu thuộc nhóm này. */
  allocated: number;
  status: string;
  cashIssued: boolean;
  cashIssuedAt: string | null;
  payer: UserRef;
}

export type CashAdvanceOutsideReason =
  | "OTHER_ADVANCE"
  | "FUND"
  | "OVER_LIMIT"
  | "NOT_CONFIRMED"
  | "LARK_LEDGER"
  | "CASH_FLOW";

export interface CashAdvanceDetail extends CashAdvance {
  expenses: {
    locked: CashAdvanceExpenseRow[];
    projected: CashAdvanceExpenseRow[];
    outside: Array<
      CashAdvanceExpenseRow & {
        reason: CashAdvanceOutsideReason;
        advanceCodes: string[];
      }
    >;
  };
}

export interface CashAdvanceQuery {
  branchId?: number;
  status?: string;
  recipientId?: number;
  createdBy?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  refundState?: "NEEDS_REFUND" | "OVERDUE";
  orderBy?: "advanceDate" | "amount" | "createdAt";
  orderDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CashAdvanceInput {
  branchId: number;
  recipientId: number;
  amount: number;
  advanceDate: string;
  periodMode: CashAdvancePeriodMode;
  periodYear?: number;
  periodWeek?: number;
  periodFrom?: string;
  periodTo?: string;
  description: string;
  attachments?: CashAdvanceAttachment[];
  clientUuid?: string;
}

export interface CashAdvanceListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totals: Record<string, number>;
}

export interface CashAdvanceRefund {
  id: number;
  code: string;
  advanceId: number;
  branchId: number;
  branch?: UserRef;
  refunderId: number;
  refunder: { id: number; name: string };
  amount: number;
  refundDate: string;
  description: string | null;
  status: CashAdvanceStatus;
  confirmedAt: string | null;
  confirmer?: UserRef;
  completedAt: string | null;
  completer?: UserRef;
  cancelledAt: string | null;
  canceller?: UserRef;
  cancelReason: string | null;
  createdBy: number;
  creator?: UserRef;
  createdAt: string;
  attachments: CashAdvanceAttachment[];
  advance: {
    id: number;
    code: string;
    amount: number;
    status: CashAdvanceStatus;
    advanceDate: string;
    periodFrom: string;
    periodTo: string;
    refundDueDate: string;
    periodLabel: string;
    recipient: { id: number; name: string };
  };
  fundTransaction: CashAdvanceFundRow | null;
}

export interface CashAdvanceRefundQuery {
  branchId?: number;
  status?: string;
  refunderId?: number;
  advanceId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CashAdvanceRefundInput {
  advanceId: number;
  amount: number;
  refundDate: string;
  description?: string;
  attachments?: CashAdvanceAttachment[];
  clientUuid?: string;
}

export interface RefundableAdvance {
  id: number;
  code: string;
  branchId: number;
  branch?: UserRef;
  recipient: { id: number; name: string };
  amount: number;
  periodLabel: string;
  periodTo: string;
  refundDueDate: string;
  overdue: boolean;
  needsRefund: boolean;
  usage: CashAdvanceUsage;
}

export interface BlockingAdvance {
  id: number;
  code: string;
  branchId: number;
  refundDueDate: string;
  remaining: number;
}

export interface EntryAdvanceCoverage {
  entryId: number;
  amount: number;
  covered: number;
  uncovered: number;
  parts: Array<{ advanceId: number; code: string; amount: number }>;
}

export const cashAdvancesApi = {
  list: (
    params?: CashAdvanceQuery,
  ): Promise<CashAdvanceListResponse<CashAdvance>> =>
    apiClient.get("/cash-advances", params),
  get: (id: number): Promise<CashAdvanceDetail> =>
    apiClient.get(`/cash-advances/${id}`),
  create: (payload: CashAdvanceInput): Promise<CashAdvance> =>
    apiClient.post("/cash-advances", payload),
  update: (
    id: number,
    payload: Partial<Omit<CashAdvanceInput, "branchId" | "clientUuid">>,
  ): Promise<CashAdvance> => apiClient.patch(`/cash-advances/${id}`, payload),
  confirm: (id: number): Promise<CashAdvance> =>
    apiClient.post(`/cash-advances/${id}/confirm`),
  uploadSigned: (
    id: number,
    attachments: CashAdvanceAttachment[],
  ): Promise<CashAdvance> =>
    apiClient.post(`/cash-advances/${id}/signed`, { attachments }),
  cancel: (id: number, reason: string): Promise<CashAdvance> =>
    apiClient.post(`/cash-advances/${id}/cancel`, { reason }),
  recipientStatus: (
    recipientId: number,
  ): Promise<{ blocked: boolean; advances: BlockingAdvance[] }> =>
    apiClient.get("/cash-advances/recipient-status", { recipientId }),
  fundBalance: (
    branchId: number,
  ): Promise<{ branchId: number; closing: number }> =>
    apiClient.get("/cash-advances/fund-balance", { branchId }),
  refundable: (
    id: number,
  ): Promise<{
    advanceId: number;
    suggested: number;
    max: number;
    usage: CashAdvanceUsage;
  }> => apiClient.get(`/cash-advances/${id}/refundable`),
  refundableAdvances: (params?: {
    branchId?: number;
    search?: string;
  }): Promise<RefundableAdvance[]> =>
    apiClient.get("/cash-advances/refundable-advances", params),
  coverage: (entryId: number): Promise<EntryAdvanceCoverage> =>
    apiClient.get(`/cash-advances/coverage/${entryId}`),
  releaseEntry: (
    entryId: number,
    reason: string,
  ): Promise<{ entryId: number; released: boolean }> =>
    apiClient.post(`/cash-advances/entries/${entryId}/release`, { reason }),
};

export const cashAdvanceRefundsApi = {
  list: (
    params?: CashAdvanceRefundQuery,
  ): Promise<CashAdvanceListResponse<CashAdvanceRefund>> =>
    apiClient.get("/cash-advance-refunds", params),
  get: (id: number): Promise<CashAdvanceRefund> =>
    apiClient.get(`/cash-advance-refunds/${id}`),
  create: (payload: CashAdvanceRefundInput): Promise<CashAdvanceRefund> =>
    apiClient.post("/cash-advance-refunds", payload),
  update: (
    id: number,
    payload: Partial<Omit<CashAdvanceRefundInput, "advanceId" | "clientUuid">>,
  ): Promise<CashAdvanceRefund> =>
    apiClient.patch(`/cash-advance-refunds/${id}`, payload),
  confirm: (id: number): Promise<CashAdvanceRefund> =>
    apiClient.post(`/cash-advance-refunds/${id}/confirm`),
  uploadSigned: (
    id: number,
    attachments: CashAdvanceAttachment[],
  ): Promise<CashAdvanceRefund> =>
    apiClient.post(`/cash-advance-refunds/${id}/signed`, { attachments }),
  cancel: (id: number, reason: string): Promise<CashAdvanceRefund> =>
    apiClient.post(`/cash-advance-refunds/${id}/cancel`, { reason }),
};
