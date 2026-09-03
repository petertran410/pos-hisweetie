import { apiClient, API_URL, getAuthHeaders } from "@/lib/config/api";

// ==================================================================
// KIỂU DỮ LIỆU
// ==================================================================

/** Trạng thái nợ — ba mức theo quy trình vận hành. */
export type DebtStatus = "OVERDUE" | "DUE" | "NORMAL";
export type RequiredPaymentSource = "CREDIT_LIMIT" | "INVOICE" | "TIE" | "NONE";

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  OVERDUE: "Quá Hạn",
  DUE: "Đến Hạn",
  NORMAL: "Bình Thường",
};

/** Hình thức công nợ. */
export type DebtForm = "TRUST" | "CONTRACT" | "COD" | "PREPAID";

export const DEBT_FORM_LABELS: Record<DebtForm, string> = {
  TRUST: "Công Nợ Tín Nhiệm",
  CONTRACT: "Hợp Đồng Công Nợ",
  COD: "Thanh Toán Khi Nhận Hàng",
  PREPAID: "Chuyển khoản ngay",
};

export type PaymentHistory =
  | "ON_TIME"
  | "SLIGHT_LATE"
  | "OFTEN_LATE"
  | "HIGH_RISK";

export const PAYMENT_HISTORY_LABELS: Record<PaymentHistory, string> = {
  ON_TIME: "Thanh toán đúng hạn",
  SLIGHT_LATE: "Thanh toán trễ nhẹ",
  OFTEN_LATE: "Thường xuyên chậm trễ",
  HIGH_RISK: "Có rủi ro cao",
};

export interface AutoPaymentHistoryInfo {
  history: PaymentHistory;
  sampleSize: number;
  lateCount: number;
  maxDaysOverdue: number;
  currentOverdueDays: number;
  reason: string;
}

export interface AppliedPaymentHistoryInfo {
  auto: AutoPaymentHistoryInfo;
  applied: PaymentHistory;
  isOverridden: boolean;
  overrideNote: string | null;
  overriddenAt: string | null;
}

/** Số ngày ân hạn — khớp DEBT_GRACE_DAYS ở backend. */
export const DEBT_GRACE_DAYS = 5;

/** Ngưỡng cảnh báo số tiền tối thiểu khi đi thu hồi nợ. */
export const MIN_PAYMENT_RATIO_WARN = 0.3;

/** Các kỳ hạn công nợ đang dùng thực tế. */
export const COMMON_TERM_DAYS = [1, 3, 5, 7, 10, 15, 20, 30, 45, 55];

export interface DebtLastPayment {
  id: number;
  code: string;
  amount: number;
  transDate: string;
  method: string | null;
  description: string | null;
}

/** Đánh giá cam kết tần suất trả tiền ("1 tháng N lần"). */
export interface PaymentFrequencyInfo {
  paymentsThisMonth: number;
  required: number;
  met: boolean;
  remaining: number;
}

export interface DebtOpenTicket {
  ticketId: number;
  ticketCode: string;
  ticketStatus: string;
  lineId: number;
  assigneeId: number;
  assignee: { id: number; name: string } | null;
  minimumPayment: number | null;
  confirmedAmount: number | null;
  confirmedDate: string | null;
  debtAtCreate: number;
  lineStatus: "PENDING" | "PARTIAL" | "PAID";
  isPaid: boolean;
  ticketType: string;
  requiredPaymentAmount: number;
}

export interface DebtPolicyView {
  hasCreditLimit: boolean;
  creditLimit: number | null;
  hasTermDays: boolean;
  termDays: number | null;
  paymentFrequency: number | null;
  debtForm: DebtForm | null;
  /** Có thể chưa có ở preview import (chỉ có ở dữ liệu danh sách). */
  paymentHistory?: AppliedPaymentHistoryInfo;
  salePic: { id: number; name: string } | null;
  accountantPic: { id: number; name: string } | null;
  salePicId?: number | null;
  accountantPicId?: number | null;
  requireFullPaymentForInvoice?: boolean;
}

export interface DebtTrackingRow {
  customerId: number;
  code: string | null;
  name: string;
  contactNumber: string | null;
  branch: { id: number; name: string } | null;

  totalDebt: number;
  lastPayment: DebtLastPayment | null;
  paymentFrequency: PaymentFrequencyInfo | null;

  policy: DebtPolicyView;

  overdueAmount: number;
  dueAmount: number;
  dueSoonAmount: number;
  notDueAmount: number;
  /** Nợ thuộc hóa đơn chưa báo đơn giao hàng. */
  undeliveredAmount: number;
  /** Nợ không gắn được hóa đơn nào (nợ cũ trước khi hệ thống chạy). */
  unallocatedAmount: number;
  nearestDueDate: string | null;
  maxDaysOverdue: number;
  creditLimit: number | null;
  creditUsageRatio: number | null;
  limitReached: boolean;
  overLimitAmount: number;
  limitOverdueAmount: number;
  invoiceRequiredAmount: number;
  /** Số tiền hệ thống đề xuất cần thu ngay theo chính sách. */
  requiredPaymentAmount: number;
  requiredPaymentSource: RequiredPaymentSource;
  debtStatus: DebtStatus;
  outstandingCount: number;

  accountantNote: string | null;
  accountantNoteAt: string | null;
  saleNote: string | null;
  saleNoteAt: string | null;

  openTicket: DebtOpenTicket | null;
}

export interface DebtTrackingListResponse {
  data: DebtTrackingRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DebtTrackingSummary {
  totalCustomers: number;
  totalDebt: number;
  overdueAmount: number;
  dueAmount: number;
  dueSoonAmount: number;
  notDueAmount: number;
  undeliveredAmount: number;
  unallocatedAmount: number;
  overLimitAmount: number;
  limitOverdueAmount: number;
  invoiceRequiredAmount: number;
  requiredPaymentAmount: number;
  byDebtStatus: Record<DebtStatus, number>;
  customersOverLimit: number;
  customersWithOpenTicket: number;
}

export interface DebtTrackingParams {
  search?: string;
  debtStatus?: DebtStatus;
  hasCreditLimit?: boolean;
  hasTermDays?: boolean;
  debtForm?: DebtForm;
  overLimitOnly?: boolean;
  branchId?: number;
  salePicId?: number;
  accountantPicId?: number;
  withoutOpenTicket?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface DebtPolicy {
  id: number;
  customerId: number;
  hasCreditLimit: boolean;
  creditLimit: string | number | null;
  hasTermDays: boolean;
  termDays: number | null;
  paymentFrequency: number | null;
  debtForm: DebtForm | null;
  salePicId: number | null;
  accountantPicId: number | null;
  isActive: boolean;
  requireFullPaymentForInvoice: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDebtPolicyPayload {
  hasCreditLimit: boolean;
  creditLimit?: number;
  hasTermDays: boolean;
  termDays?: number;
  paymentFrequency?: number | null;
  debtForm?: DebtForm | null;
  salePicId?: number | null;
  accountantPicId?: number | null;
  isActive?: boolean;
  requireFullPaymentForInvoice?: boolean;
}

export interface DebtNote {
  id: number;
  customerId: number;
  accountantNote: string | null;
  accountantNoteAt: string | null;
  saleNote: string | null;
  saleNoteAt: string | null;
}

export interface OutstandingInvoice {
  id: number;
  code: string;
  grandTotal: number;
  outstanding: number;
  deliveredAt: string | null;
  purchaseDate: string;
  dueDate: string | null;
  overdueDate: string | null;
  daysOverdue: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export interface DebtTrackingDetail {
  customer: {
    id: number;
    code: string | null;
    name: string;
    contactNumber: string | null;
    branch: { id: number; name: string } | null;
    totalDebt: number;
  };
  policy: DebtPolicy | null;
  note: DebtNote | null;
  aging: {
    totalDebt: number;
    outstandingInvoices: OutstandingInvoice[];
    overdueAmount: number;
    dueAmount: number;
    dueSoonAmount: number;
    notDueAmount: number;
    undeliveredAmount: number;
    unallocatedAmount: number;
    nearestDueDate: string | null;
    maxDaysOverdue: number;
    creditLimit: number | null;
    creditUsageRatio: number | null;
    limitReached: boolean;
    overLimitAmount: number;
    limitOverdueAmount: number;
    invoiceRequiredAmount: number;
    requiredPaymentAmount: number;
    requiredPaymentSource: RequiredPaymentSource;
    debtStatus: DebtStatus;
  };
  paymentFrequency: PaymentFrequencyInfo | null;
  recentPayments: DebtLastPayment[];
  tickets: Array<{
    ticketId: number;
    ticketCode: string;
    ticketStatus: string;
    assignee: { id: number; name: string } | null;
    debtAtCreate: number;
    minimumPayment: number | null;
    confirmedAmount: number | null;
    confirmedDate: string | null;
    status: string;
    isLatest: boolean;
    paidAt: string | null;
    paidAmount: number | null;
    createdAt: string;
    closedAt: string | null;
  }>;
}

// ==================================================================
// IMPORT EXCEL
// ==================================================================

export interface PolicyImportRow {
  row: number;
  code: string;
  debtForm: string;
  debtType: string;
  creditLimit: string;

  hasCreditLimit: boolean;
  hasTermDays: boolean;
  termDays: number | null;
  paymentFrequency: number | null;
  creditLimitValue: number | null;
  debtFormValue: DebtForm | null;

  customerId: number | null;
  customerName: string | null;
  action: "create" | "update" | "error";
  errors: string[];
  warnings: string[];
}

export interface PolicyImportPreview {
  total: number;
  valid: number;
  invalid: number;
  create: number;
  update: number;
  warningCount: number;
  canCommit: boolean;
  rows: PolicyImportRow[];
}

export interface PolicyImportResult {
  message: string;
  total: number;
  created: number;
  updated: number;
  warningCount: number;
  warnings: Array<{ row: number; code: string; warnings: string[] }>;
}

// ==================================================================
// TIỆN ÍCH
// ==================================================================

/** Mô tả loại công nợ theo hai chiều đang bật. */
export function describeDebtPolicy(p?: DebtPolicyView | null): string {
  if (!p) return "Không Công Nợ";
  const parts: string[] = [];
  if (p.hasCreditLimit) parts.push("Hạn Mức");
  if (p.hasTermDays && p.termDays != null) {
    parts.push(`Công Nợ ${p.termDays} Ngày`);
  }
  if (p.paymentFrequency) parts.push(`1 Tháng ${p.paymentFrequency} Lần`);
  return parts.length ? parts.join(", ") : "Không Công Nợ";
}

// ==================================================================
// API
// ==================================================================

export const debtTrackingApi = {
  getList: (params?: DebtTrackingParams): Promise<DebtTrackingListResponse> =>
    apiClient.get(`/debt-tracking`, params),

  getSummary: (params?: DebtTrackingParams): Promise<DebtTrackingSummary> =>
    apiClient.get(`/debt-tracking/summary`, params),

  getDetail: (customerId: number): Promise<DebtTrackingDetail> =>
    apiClient.get(`/debt-tracking/${customerId}/detail`),

  /** Gợi ý số tiền tối thiểu cần thu = phần nợ đã đến hạn. */
  getSuggestedMinimum: (
    customerId: number
  ): Promise<{ customerId: number; suggestedMinimumPayment: number }> =>
    apiClient.get(`/debt-tracking/${customerId}/suggested-minimum`),

  getPolicy: (
    customerId: number
  ): Promise<{
    customer: { id: number; code: string; name: string; totalDebt: string };
    policy: DebtPolicy | null;
  }> => apiClient.get(`/debt-tracking/policy/${customerId}`),

  upsertPolicy: (
    customerId: number,
    payload: UpsertDebtPolicyPayload
  ): Promise<DebtPolicy> =>
    apiClient.put(`/debt-tracking/policy/${customerId}`, payload),

  /**
   * Chỉ gửi field thực sự muốn sửa. Backend phân quyền riêng cho từng cột,
   * gửi kèm cột không có quyền sẽ bị từ chối.
   */
  updateNote: (
    customerId: number,
    payload: { accountantNote?: string | null; saleNote?: string | null }
  ): Promise<DebtNote> =>
    apiClient.patch(`/debt-tracking/note/${customerId}`, payload),

  /** Ghi đè đánh giá tự động, bắt buộc nêu lý do. */
  updatePaymentHistory: (
    customerId: number,
    payload: { paymentHistoryOverride: PaymentHistory; reason: string }
  ): Promise<DebtPolicy> =>
    apiClient.patch(`/debt-tracking/payment-history/${customerId}`, payload),

  /** Tải file Excel. Dùng fetch trực tiếp vì apiClient trả JSON. */
  exportExcel: async (params?: DebtTrackingParams): Promise<Blob> => {
    const qs = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });

    const res = await fetch(`${API_URL}/debt-tracking/export?${qs.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Xuất Excel thất bại");
    return res.blob();
  },

  // ---------------- Import Excel ----------------

  /** Tải file Excel mẫu. */
  downloadTemplate: async (): Promise<Blob> => {
    const res = await fetch(`${API_URL}/debt-tracking/import/template`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Tải file mẫu thất bại");
    return res.blob();
  },

  /** Bước 1: kiểm tra file, KHÔNG ghi DB. */
  previewImport: async (file: File): Promise<PolicyImportPreview> => {
    const form = new FormData();
    form.append("file", file);
    // Bỏ Content-Type để trình duyệt tự set boundary cho multipart.
    const headers = { ...getAuthHeaders() } as Record<string, string>;
    delete headers["Content-Type"];

    const res = await fetch(`${API_URL}/debt-tracking/import/preview`, {
      method: "POST",
      headers,
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || "Kiểm tra file thất bại");
    }
    return json;
  },

  /** Bước 2: ghi DB. Backend từ chối toàn bộ nếu còn dòng lỗi. */
  commitImport: async (file: File): Promise<PolicyImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const headers = { ...getAuthHeaders() } as Record<string, string>;
    delete headers["Content-Type"];

    const res = await fetch(`${API_URL}/debt-tracking/import`, {
      method: "POST",
      headers,
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || "Import thất bại");
    }
    return json;
  },
};
