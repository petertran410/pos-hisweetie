import { apiClient } from "@/lib/config/api";

export type InternalFinanceDirection = "EXPENSE" | "RECEIPT";

export type InternalFinanceCategory =
  | "DELIVERY_FEE"
  | "FUEL"
  | "VEHICLE_CARE"
  | "SALARY_ADVANCE"
  | "CUSTOMER_RECEIPT"
  | "MANUAL_RECEIPT"
  | "OTHER_EXPENSE"
  | "CASH_FUND_EXPENSE"
  | "CASH_FUND_RECEIPT";

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
  accountantReviewer?: { id: number; name: string } | null;
  managerReviewer?: { id: number; name: string } | null;
  cashIssued: boolean;
  cashIssuedAt: string | null;
  cashIssuedReason?: string | null;
  cashIssuer?: { id: number; name: string } | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  canceller?: { id: number; name: string } | null;
  _count?: { reviewNotes?: number };
  vehicleName?: string | null;
  vehicleServiceType?: string | null;
  vehicleOdo?: number | string | null;
  vehicleLiters?: number | string | null;
  vehicleUnitPrice?: number | string | null;
  vehicleLocation?: string | null;
  vehicleAnomalyStatus?: string | null;
  vehicleId?: number | null;
  vehicle?: {
    id: number;
    label: string;
    plate: string;
    driver?: { id: number; name: string } | null;
  } | null;
  vehicleDueAt?: string | null;
  vehicleServiceTypes?: string[];
  payerId?: number | null;
  payer?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  expenseItem?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  note?: string | null;
  packingSlip?: { id: number; code: string } | null;
  customer?: { id: number; code: string | null; name: string } | null;
  weeklyBatch?: {
    id: number;
    code: string;
    status: string;
    approvalRequestId: number | null;
    approvalRequest?: {
      id: number;
      status: string;
      instanceCode: string | null;
      currentNode: string | null;
    } | null;
  } | null;
  cashFlow?: { id: number; code: string; status: number } | null;
  fundTransaction?: { id: number; code: string; status: string } | null;
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
  orderBy?: "occurredAt" | "amount";
  orderDirection?: "asc" | "desc";
}

export interface InternalFinanceResponse<T = InternalFinanceEntry> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  /** Phiếu chi kho: tổng của toàn bộ phiếu khớp bộ lọc. */
  totals?: { amount: number; issuedAmount: number };
}

export interface WarehouseCustomer {
  id: number;
  code?: string | null;
  name: string;
}

export interface WarehouseCashFlowRef {
  id: number;
  code: string;
  customerId?: number | null;
  amount?: number;
}

export interface WarehouseAllocatableInvoice {
  id: number;
  code: string;
  customerId?: number | null;
  debtAmount?: number | string;
  purchaseDate?: string;
  /** Hóa đơn của phiếu giao hàng (hiện mặc định khi lập phiếu thu). */
  inPackingSlip?: boolean;
}

export type WarehouseConfirmMode = "MATCH" | "MANUAL";

export interface WarehouseReceipt extends InternalFinanceEntry {
  /** Số kế toán kho xác nhận thực nhận; phiếu thu chỉ lập theo số này. */
  confirmedAmount?: number | string | null;
  confirmedMode?: WarehouseConfirmMode | null;
  confirmedAt?: string | null;
  confirmer?: { id: number; name: string } | null;
  /** Số báo đơn − số xác nhận (dương = thiếu). */
  difference?: number | null;
  sourceSnapshot?:
    | (Record<string, unknown> & {
        receiptKind?: "CUSTOMER" | "WAREHOUSE_SALE";
        note?: string;
      })
    | null;
  customers?: WarehouseCustomer[];
  note?: string;
  postedCashFlows?: WarehouseCashFlowRef[];
  allocatableInvoices?: WarehouseAllocatableInvoice[];
  invoiceLinks: Array<{
    invoice: {
      id: number;
      code: string;
      customerId?: number | null;
      debtAmount?: number | string;
      grandTotal?: number | string;
      purchaseDate?: string;
      customer?: WarehouseCustomer | null;
    };
  }>;
}

export interface WarehouseReceiptQuery {
  branchIds?: number[];
  fromDate?: string;
  toDate?: string;
  receiptStatus?: "OPEN" | "POSTED" | "CANCELLED" | "";
  confirmStatus?: "UNCONFIRMED" | "CONFIRMED" | "DIFFERENT" | "";
  search?: string;
  page?: number;
  limit?: number;
}

export interface FinanceAccessSummary {
  superAdmin: boolean;
  branches: Array<{ branchId: number; permissions: string[] }>;
}

export interface WarehouseExpenseQuery {
  branchId?: number;
  category?: string;
  status?: string;
  cashIssued?: "ISSUED" | "NOT_ISSUED" | "";
  checkStatus?: "CHECKED" | "UNCHECKED" | "";
  payerId?: number;
  expenseItem?: string;
  vehicleId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  orderBy?: "occurredAt" | "amount";
  orderDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface WarehouseExpenseInput {
  branchId: number;
  /** Bỏ trống khi nhập Số lượng × Đơn giá, backend tự tính. */
  amount?: number;
  occurredAt: string;
  description: string;
  expenseItem?: string;
  quantity?: number | null;
  unitPrice?: number | null;
  note?: string;
  payerId?: number;
  attachments?: InternalFinanceAttachment[];
}

export type VehicleEntryKind = "FUEL" | "VEHICLE_CARE";

export interface FuelMetrics {
  prevOdo: number | null;
  nextOdo: number | null;
  kmInPeriod: number | null;
  prevAmount: number | null;
  nextLiters: number | null;
  costPerKm: number | null;
  litersPer100Km: number | null;
  normMin: number | null;
  normMax: number | null;
  consumptionCheck: "NORMAL" | "ABNORMAL" | null;
  costCheck: "NORMAL" | "ABNORMAL" | null;
}

export type VehicleEntry = InternalFinanceEntry & {
  metrics?: FuelMetrics | null;
};

export interface VehicleEntryQuery {
  branchId?: number;
  category: VehicleEntryKind;
  vehicleId?: number;
  serviceType?: string;
  check?: "NORMAL" | "ABNORMAL";
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FuelEntryInput {
  branchId: number;
  vehicleId: number;
  occurredAt: string;
  location?: string;
  amount: number;
  unitPrice?: number;
  liters?: number;
  odo?: number;
  payerId?: number;
  note?: string;
  attachments?: InternalFinanceAttachment[];
}

export interface VehicleCareEntryInput {
  branchId: number;
  vehicleId: number;
  serviceTypes: string[];
  occurredAt: string;
  location?: string;
  amount: number;
  odo?: number;
  dueAt?: string;
  payerId?: number;
  note?: string;
  attachments?: InternalFinanceAttachment[];
}

export interface VehicleEntryUpdateInput {
  vehicleId?: number;
  serviceTypes?: string[];
  occurredAt?: string;
  location?: string;
  amount?: number;
  unitPrice?: number | null;
  liters?: number | null;
  odo?: number | null;
  dueAt?: string | null;
  payerId?: number;
  note?: string;
  attachments?: InternalFinanceAttachment[];
}

export interface WarehouseReceiptInput {
  branchId?: number;
  amount?: number;
  occurredAt?: string;
  description?: string;
  note?: string;
  receiptKind?: "CUSTOMER" | "WAREHOUSE_SALE";
  customers?: Array<{ customerId: number; invoiceIds?: number[] }>;
  attachments?: InternalFinanceAttachment[];
}

export interface InternalFinanceSummary {
  receipt: number;
  expense: number;
  posted: number;
  missingEvidence: number;
  balance: number;
}

export interface WarehouseExpenseNote {
  id: number;
  entryId: number;
  content: string;
  createdAt: string;
  creator: { id: number; name: string };
  mentions: Array<{
    id: number;
    larkStatus: "PENDING" | "SENT" | "NO_LARK" | "ERROR" | string;
    sentAt: string | null;
    user: { id: number; name: string };
  }>;
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
  /** Batch đã hủy (giữ lại dữ liệu); canceller null = tự hủy khi Lark từ chối. */
  cancelledAt?: string | null;
  cancelReason?: string | null;
  canceller?: { id: number; name: string } | null;
  /** Bước làm đơn Lark kết thúc không duyệt (từ chối / thu hồi / xóa). */
  approvalNote?: ApprovalHistoryItem | null;
  /** Chi tiết batch: toàn bộ lịch sử duyệt Lark. */
  approvalHistory?: ApprovalHistoryItem[];
}

export interface ApprovalHistoryItem {
  type: string;
  time: string | null;
  comment: string | null;
  userName: string | null;
}

export type LarkFormKind =
  "PHIEU_THU" | "PHIEU_CHI" | "PHIEU_CHI_KHO_HN" | "PHIEU_CHI_KHO_SG";

/** Đơn nhân viên tạo trực tiếp trên Lark Approval (không có mã đơn Lark). */
export interface LarkApprovalRow {
  id: number;
  formKind: LarkFormKind;
  status: string;
  requesterName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  occurredAt: string | null;
  amount: number | null;
  cashAmount: number | null;
  method: string | null;
  cashSource: string | null;
  description: string | null;
  branchId: number | null;
  branchName: string | null;
  direction: "EXPENSE" | "RECEIPT" | null;
  inScope: boolean;
  skipReason: string | null;
  entry: { id: number; code: string; status: string } | null;
  suspectDuplicate: { id: number; code: string; status: string } | null;
  syncedAt: string;
}

export interface LarkApprovalQuery {
  branchIds?: number[];
  formKind?: string;
  status?: string;
  scope?: "IN" | "OUT" | string;
  suspect?: "true" | string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
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

  createFuel: (payload: FuelEntryInput): Promise<VehicleEntry> =>
    apiClient.post("/internal-finance/vehicle/fuel", payload),

  createVehicleCare: (payload: VehicleCareEntryInput): Promise<VehicleEntry> =>
    apiClient.post("/internal-finance/vehicle-care", payload),

  vehicleEntries: (
    params: VehicleEntryQuery,
  ): Promise<InternalFinanceResponse<VehicleEntry>> =>
    apiClient.get("/internal-finance/vehicle-entries", params),

  updateVehicleEntry: (
    id: number,
    payload: VehicleEntryUpdateInput,
  ): Promise<VehicleEntry> =>
    apiClient.patch(`/internal-finance/vehicle-entries/${id}`, payload),

  cancelVehicleEntry: (id: number, reason: string): Promise<VehicleEntry> =>
    apiClient.put(`/internal-finance/vehicle-entries/${id}/cancel`, {
      reason,
    }),

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

  weeklyBatches: (params?: InternalFinanceQuery): Promise<WeeklyBatch[]> =>
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
    apiClient.post(
      `/internal-finance/weekly-batches/${id}/create-approval`,
      payload,
    ),

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

  warehouseReceipts: (
    params?: WarehouseReceiptQuery,
  ): Promise<InternalFinanceResponse<WarehouseReceipt>> =>
    apiClient.get("/internal-finance/warehouse-receipts", params),

  warehouseReceipt: (id: number): Promise<WarehouseReceipt> =>
    apiClient.get(`/internal-finance/warehouse-receipts/${id}`),

  warehouseExpenses: (
    params?: WarehouseExpenseQuery,
  ): Promise<InternalFinanceResponse<InternalFinanceEntry>> =>
    apiClient.get("/internal-finance/warehouse-expenses", params),

  createWarehouseExpense: (
    payload: WarehouseExpenseInput,
  ): Promise<InternalFinanceEntry> =>
    apiClient.post("/internal-finance/warehouse-expenses/manual", payload),

  updateWarehouseExpense: (
    id: number,
    payload: Partial<Omit<WarehouseExpenseInput, "branchId">>,
  ): Promise<InternalFinanceEntry> =>
    apiClient.patch(`/internal-finance/warehouse-expenses/${id}`, payload),

  warehouseExpenseCarryOver: (params: {
    branchId: number;
    weekStart: string;
  }): Promise<{
    data: Array<{
      id: number;
      code: string;
      occurredAt: string;
      description: string | null;
      amount: number | string;
    }>;
    total: number;
  }> =>
    apiClient.get(
      "/internal-finance/warehouse-expenses/weekly-carry-over",
      params,
    ),

  addWeeklyBatchEntries: (
    batchId: number,
    entryIds: number[],
  ): Promise<{ added: number; skipped: number }> =>
    apiClient.post(
      `/internal-finance/warehouse-expenses/weekly-batches/${batchId}/add-entries`,
      { entryIds },
    ),

  removeWeeklyBatchEntries: (
    batchId: number,
    entryIds: number[],
  ): Promise<{ removed: number; batchDeleted: boolean }> =>
    apiClient.post(
      `/internal-finance/warehouse-expenses/weekly-batches/${batchId}/remove-entries`,
      { entryIds },
    ),

  larkApprovals: (
    params?: LarkApprovalQuery,
  ): Promise<{
    data: LarkApprovalRow[];
    total: number;
    totalAmount: number;
    page: number;
    limit: number;
  }> => apiClient.get("/internal-finance/lark-approvals", params),

  warehouseExpenseBatchPage: (
    params?: InternalFinanceQuery,
  ): Promise<{
    data: WeeklyBatch[];
    total: number;
    /** Số batch / tổng tiền không tính batch đã hủy (trừ khi lọc "Đã hủy"). */
    batchCount?: number;
    totalAmount: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get(
      "/internal-finance/warehouse-expenses/weekly-batch-pages",
      params,
    ),

  warehouseExpenseBatches: (
    params?: InternalFinanceQuery,
  ): Promise<WeeklyBatch[]> =>
    apiClient.get(
      "/internal-finance/warehouse-expenses/weekly-batches",
      params,
    ),

  warehouseExpenseBatch: (
    id: number,
  ): Promise<WeeklyBatch & { entries: InternalFinanceEntry[] }> =>
    apiClient.get(`/internal-finance/warehouse-expenses/weekly-batches/${id}`),

  prepareWarehouseExpenseBatch: (payload: {
    branchId: number;
    weekStart: string;
    weekEnd: string;
  }): Promise<WeeklyBatch> =>
    apiClient.post(
      "/internal-finance/warehouse-expenses/weekly-batches/prepare",
      payload,
    ),

  createWarehouseExpenseApproval: (
    id: number,
    payload?: { detailUrl?: string; viewUrl?: string },
  ): Promise<unknown> =>
    apiClient.post(
      `/internal-finance/warehouse-expenses/weekly-batches/${id}/create-approval`,
      payload,
    ),

  cancelWarehouseExpense: (
    id: number,
    reason: string,
  ): Promise<InternalFinanceEntry> =>
    apiClient.put(`/internal-finance/warehouse-expenses/${id}/cancel`, {
      reason,
    }),

  warehouseExpenseNotes: (id: number): Promise<WarehouseExpenseNote[]> =>
    apiClient.get(`/internal-finance/warehouse-expenses/${id}/notes`),

  warehouseExpenseMentionCandidates: (
    id: number,
  ): Promise<Array<{ id: number; name: string }>> =>
    apiClient.get(
      `/internal-finance/warehouse-expenses/${id}/mention-candidates`,
    ),

  createWarehouseExpenseNote: (
    id: number,
    payload: { content: string; mentionUserIds: number[] },
  ): Promise<{ note: WarehouseExpenseNote; sent: number; failed: number }> =>
    apiClient.post(`/internal-finance/warehouse-expenses/${id}/notes`, payload),

  cancelWarehouseExpenseBatch: (
    id: number,
    reason: string,
  ): Promise<{ id: number; code: string; released: number }> =>
    apiClient.post(
      `/internal-finance/warehouse-expenses/weekly-batches/${id}/cancel`,
      { reason },
    ),

  markWarehouseExpenseIssued: (
    id: number,
    cashIssued: boolean,
    reason?: string,
  ): Promise<InternalFinanceEntry> =>
    apiClient.patch(`/internal-finance/warehouse-expenses/${id}/mark-issued`, {
      cashIssued,
      reason,
    }),

  access: (): Promise<FinanceAccessSummary> =>
    apiClient.get("/internal-finance/access"),

  warehouseExpensePayerSummary: (
    params?: WarehouseExpenseQuery,
  ): Promise<{
    rows: Array<{
      payerId: number | null;
      name: string;
      count: number;
      amount: number;
    }>;
    total: number;
    count: number;
  }> =>
    apiClient.get("/internal-finance/warehouse-expenses/payer-summary", params),

  bulkCheckWarehouseExpenses: (payload: {
    ids: number[];
    role: "manager" | "accountant";
  }): Promise<{
    updated: InternalFinanceEntry[];
    skipped: Array<{ id: number; code: string; reason: string }>;
    alreadyChecked: number;
  }> =>
    apiClient.patch("/internal-finance/warehouse-expenses/check-bulk", payload),

  checkWarehouseExpense: (
    id: number,
    role: "manager" | "accountant",
    checked: boolean,
  ): Promise<InternalFinanceEntry> =>
    apiClient.patch(`/internal-finance/warehouse-expenses/${id}/check`, {
      role,
      checked,
    }),

  createWarehouseReceipt: (
    payload: WarehouseReceiptInput,
  ): Promise<WarehouseReceipt> =>
    apiClient.post("/internal-finance/warehouse-receipts", payload),

  updateWarehouseReceipt: (
    id: number,
    payload: Partial<WarehouseReceiptInput>,
  ): Promise<WarehouseReceipt> =>
    apiClient.patch(`/internal-finance/warehouse-receipts/${id}`, payload),

  confirmWarehouseReceiptAmount: (
    id: number,
    payload: { mode: WarehouseConfirmMode | "CLEAR"; amount?: number },
  ): Promise<WarehouseReceipt> =>
    apiClient.patch(
      `/internal-finance/warehouse-receipts/${id}/confirm-amount`,
      payload,
    ),

  postWarehouseReceipt: (
    id: number,
    payload: {
      allocations: Array<{
        customerId: number;
        amount: number;
        invoices: Array<{ invoiceId: number; amount: number }>;
      }>;
    },
  ): Promise<WarehouseReceipt> =>
    apiClient.post(`/internal-finance/warehouse-receipts/${id}/post`, payload),

  cancelWarehouseReceipt: (
    id: number,
    payload: { cancelCashFlows: boolean },
  ): Promise<WarehouseReceipt> =>
    apiClient.put(`/internal-finance/warehouse-receipts/${id}/cancel`, payload),

  postEntry: (id: number): Promise<unknown> =>
    apiClient.post(`/internal-finance/${id}/post`),

  addAttachments: (
    id: number,
    attachments: InternalFinanceAttachment[],
  ): Promise<InternalFinanceEntry> =>
    apiClient.post(`/internal-finance/${id}/attachments`, { attachments }),
};
