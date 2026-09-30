import { apiClient } from "@/lib/config/api";

export type InternalFinanceDirection = "EXPENSE" | "RECEIPT";

export type InternalFinanceCategory =
  | "DELIVERY_FEE"
  | "FUEL"
  | "VEHICLE_CARE"
  | "SALARY_ADVANCE"
  | "CUSTOMER_RECEIPT"
  | "MANUAL_RECEIPT"
  | "OTHER_EXPENSE";

export interface InternalFinanceAttachment {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  kind?: string;
}

export interface InternalFinanceReview {
  id: number;
  role: string;
  decision: string;
  note: string | null;
  reason: string | null;
  dueAt: string | null;
  createdAt: string;
  reviewer?: { id: number; name: string } | null;
  reviewerNameSnapshot?: string | null;
}

export interface InternalFinanceEntry {
  id: number;
  code: string;
  direction: InternalFinanceDirection;
  category: InternalFinanceCategory | string;
  subCategory?: string | null;
  branchId: number;
  branch?: { id: number; name: string } | null;
  amount: number | string;
  occurredAt: string;
  sourceType: string;
  sourceId: string | null;
  description: string | null;
  evidenceStatus: string;
  status: string;
  requiresEvidence: boolean;
  exceptionReason: string | null;
  exceptionDueAt: string | null;
  accountantReviewedAt: string | null;
  managerReviewedAt: string | null;
  cashIssued: boolean;
  cashIssuedAt: string | null;
  cashIssuer?: { id: number; name: string } | null;
  vehicleName?: string | null;
  vehicleServiceType?: string | null;
  vehicleOdo?: number | string | null;
  vehicleLiters?: number | string | null;
  vehicleUnitPrice?: number | string | null;
  vehicleLocation?: string | null;
  vehicleAnomalyStatus?: string | null;
  packingSlip?: { id: number; code: string } | null;
  customer?: { id: number; code: string | null; name: string } | null;
  weeklyBatch?: {
    id: number;
    code: string;
    status: string;
    approvalRequestId: number | null;
  } | null;
  cashFlow?: { id: number; code: string; status: number } | null;
  attachments: InternalFinanceAttachment[];
  invoiceLinks: Array<{
    invoice: { id: number; code: string };
  }>;
  reviews: InternalFinanceReview[];
  sourceSnapshot?: Record<string, unknown> | null;
}

export interface InternalFinanceQuery {
  branchIds?: number[];
  direction?: string;
  category?: string;
  subCategory?: string;
  status?: string;
  accountantStatus?: string;
  managerStatus?: string;
  weeklyApprovalStatus?: string;
  posted?: "POSTED" | "UNPOSTED" | string;
  cashIssued?: "ISSUED" | "NOT_ISSUED" | string;
  evidenceStatus?: string;
  sourceType?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InternalFinanceResponse {
  data: InternalFinanceEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface InternalFinanceSummary {
  receipt: number;
  expense: number;
  posted: number;
  missingEvidence: number;
  balance: number;
}

export interface WeeklyBatch {
  id: number;
  code: string;
  branchId: number;
  branch?: { id: number; name: string };
  weekStart: string;
  weekEnd: string;
  totalAmount: number | string;
  status: string;
  preparedAt: string | null;
  approvalRequestId: number | null;
  approvalRequest?: {
    id: number;
    status: string;
    instanceCode: string | null;
    currentNode: string | null;
  } | null;
  _count?: { entries: number };
  cashIssuedCount?: number;
  entries?: InternalFinanceEntry[];
}

export const internalFinanceApi = {
  list: (params?: InternalFinanceQuery): Promise<InternalFinanceResponse> =>
    apiClient.get("/internal-finance", params),

  summary: (params?: InternalFinanceQuery): Promise<InternalFinanceSummary> =>
    apiClient.get("/internal-finance/summary", params),

  createManualReceipt: (payload: {
    branchId: number;
    amount: number;
    occurredAt: string;
    method: string;
    cashSource?: string;
    customerId?: number;
    invoiceIds?: number[];
    description?: string;
    attachments?: InternalFinanceAttachment[];
  }): Promise<InternalFinanceEntry> =>
    apiClient.post("/internal-finance/receipts/manual", payload),

  createManualExpense: (payload: {
    branchId: number;
    category: "SALARY_ADVANCE" | "OTHER_EXPENSE";
    amount: number;
    occurredAt: string;
    description: string;
    attachments?: InternalFinanceAttachment[];
  }): Promise<InternalFinanceEntry> =>
    apiClient.post("/internal-finance/expenses/manual", payload),

  createFuel: (payload: {
    branchId: number;
    vehicle: string;
    occurredAt: string;
    location?: string;
    amount: number;
    unitPrice?: number;
    liters?: number;
    odo?: number;
    consumptionLimit?: number;
    anomalyNote?: string;
    description?: string;
    attachments?: InternalFinanceAttachment[];
  }): Promise<InternalFinanceEntry> =>
    apiClient.post("/internal-finance/vehicle/fuel", payload),

  createVehicleCare: (payload: {
    branchId: number;
    vehicle: string;
    serviceType: string;
    location?: string;
    occurredAt: string;
    amount: number;
    odo?: number;
    dueAt?: string;
    anomalyNote?: string;
    description?: string;
    attachments?: InternalFinanceAttachment[];
  }): Promise<InternalFinanceEntry> =>
    apiClient.post("/internal-finance/vehicle-care", payload),

  review: (
    id: number,
    role: "accountant" | "manager",
    payload: {
      decision: string;
      note?: string;
      reason?: string;
      dueAt?: string;
    },
  ): Promise<{ entry: InternalFinanceEntry }> =>
    apiClient.post(
      `/internal-finance/${id}/${role === "accountant" ? "accountant-review" : "manager-review"}`,
      payload,
    ),

  weeklyBatches: (
    params?: InternalFinanceQuery,
  ): Promise<WeeklyBatch[]> =>
    apiClient.get("/internal-finance/weekly-batches", params),

  prepareWeeklyBatch: (payload: {
    branchId: number;
    weekStart: string;
    weekEnd: string;
  }): Promise<WeeklyBatch> =>
    apiClient.post("/internal-finance/weekly-batches/prepare", payload),

  createWeeklyApproval: (
    id: number,
    payload?: { detailUrl?: string; viewUrl?: string },
  ): Promise<unknown> =>
    apiClient.post(`/internal-finance/weekly-batches/${id}/create-approval`, payload),

  postWeeklyBatch: (id: number): Promise<unknown> =>
    apiClient.post(`/internal-finance/weekly-batches/${id}/post`),

  weeklyBatch: (
    id: number,
  ): Promise<WeeklyBatch & { entries: InternalFinanceEntry[] }> =>
    apiClient.get(`/internal-finance/weekly-batches/${id}`),

  updateCashIssued: (
    id: number,
    cashIssued: boolean,
  ): Promise<InternalFinanceEntry> =>
    apiClient.patch(`/internal-finance/${id}/cash-issued`, { cashIssued }),

  postEntry: (id: number): Promise<unknown> =>
    apiClient.post(`/internal-finance/${id}/post`),

  addAttachments: (
    id: number,
    attachments: InternalFinanceAttachment[],
  ): Promise<InternalFinanceEntry> =>
    apiClient.post(`/internal-finance/${id}/attachments`, { attachments }),
};
