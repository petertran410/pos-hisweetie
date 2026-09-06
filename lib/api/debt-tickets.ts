import { apiClient } from "@/lib/config/api";

/** Quá trình thu hồi nợ. */
export type DebtTicketStatus =
  | "REQUESTED"
  | "IN_PROGRESS"
  | "WAITING"
  | "PAID"
  | "DONE"
  | "ENDED";

export type DebtTicketLineStatus = "PENDING" | "PARTIAL" | "PAID";
export type DebtTicketType = "DEBT_COLLECTION" | "STOP_DELIVERY";

export const TICKET_TYPE_LABELS: Record<DebtTicketType, string> = {
  DEBT_COLLECTION: "Thu hồi công nợ",
  STOP_DELIVERY: "Ngừng đi hàng",
};

export const TICKET_STATUS_LABELS: Record<DebtTicketStatus, string> = {
  REQUESTED: "Yêu Cầu Thu Hồi Nợ",
  IN_PROGRESS: "Đang Tiến Hành",
  WAITING: "Chờ Thanh Toán",
  PAID: "Đã Thanh Toán",
  DONE: "Done",
  ENDED: "Ended",
};

/** Các bước còn hoạt động — khớp DEBT_TICKET_OPEN_STATUSES ở backend. */
export const TICKET_OPEN_STATUSES: DebtTicketStatus[] = [
  "REQUESTED",
  "IN_PROGRESS",
  "WAITING",
];

export const TICKET_LINE_STATUS_LABELS: Record<DebtTicketLineStatus, string> = {
  PENDING: "Chưa thu",
  PARTIAL: "Có tiền về, chờ phân bổ",
  PAID: "Đã thu đủ",
};

export interface DebtTicketLine {
  id: number;
  customerId: number;
  customerCode: string | null;
  customerName: string;
  contactNumber: string | null;
  /** Nợ đầu kì — snapshot lúc tạo phiếu. */
  debtAtCreate: number;
  /** Nợ cuối kì — nợ hiện tại của khách, đọc live. */
  currentDebt: number | null;
  requiredPaymentAmount: number;
  /** Số tiền tối thiểu cần phải thanh toán (hệ thống gợi ý, sửa được). */
  minimumPayment: number | null;
  /** Số tiền khách xác nhận sẽ trả — có thể nhỏ hơn mức tối thiểu. */
  confirmedAmount: number | null;
  confirmedDate: string | null;
  status: DebtTicketLineStatus;
  isLatest: boolean;
  paidAt: string | null;
  paidAmount: number | null;
  matchedSepayTxId: number | null;
  note: string | null;
  /** Cảnh báo mềm: tối thiểu dưới 30% nợ đầu kì. */
  belowMinRatio: boolean;
}

export interface DebtTicket {
  id: number;
  code: string;
  title: string | null;
  status: DebtTicketStatus;
  ticketType: DebtTicketType;
  isOpen: boolean;
  note: string | null;
  assignee: { id: number; name: string; email?: string } | null;
  creator: { id: number; name: string } | null;
  closer: { id: number; name: string } | null;
  createdAt: string;
  closedAt: string | null;
  closeMode: "AUTO" | "MANUAL" | null;
  closeReason: string | null;
  customers: DebtTicketLine[];
  summary: {
    customerCount: number;
    paidCount: number;
    pendingCount: number;
    totalDebtAtCreate: number;
    totalCurrentDebt: number;
    totalMinimum: number;
    totalConfirmed: number;
    totalPaid: number;
    isFullyPaid: boolean;
  };
  /** Cảnh báo trả về khi tạo/sửa (ví dụ tối thiểu dưới 30%). */
  warnings?: string[];
}

export interface CreateStopDeliveryPayload {
  customerId: number;
}

export interface DebtTicketListResponse {
  data: DebtTicket[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DebtTicketParams {
  search?: string;
  status?: DebtTicketStatus;
  ticketType?: DebtTicketType;
  openOnly?: "true" | "false";
  assigneeId?: number;
  customerId?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DebtTicketCustomerInput {
  customerId: number;
  minimumPayment?: number;
  confirmedAmount?: number;
  confirmedDate?: string;
  note?: string;
}

export interface CreateDebtTicketPayload {
  title?: string;
  assigneeId: number;
  status?: DebtTicketStatus;
  note?: string;
  ticketType?: DebtTicketType;
  customers: DebtTicketCustomerInput[];
}

export const debtTicketsApi = {
  getList: (params?: DebtTicketParams): Promise<DebtTicketListResponse> =>
    apiClient.get(`/debt-tickets`, params),

  getOne: (id: number): Promise<DebtTicket> =>
    apiClient.get(`/debt-tickets/${id}`),

  create: (payload: CreateDebtTicketPayload): Promise<DebtTicket> =>
    apiClient.post(`/debt-tickets`, payload),

  createStopDelivery: (payload: CreateStopDeliveryPayload): Promise<DebtTicket> =>
    apiClient.post(`/debt-tickets/stop-delivery`, payload),

  update: (
    id: number,
    payload: {
      title?: string;
      assigneeId?: number;
      status?: DebtTicketStatus;
      note?: string;
    }
  ): Promise<DebtTicket> => apiClient.patch(`/debt-tickets/${id}`, payload),

  addCustomers: (
    id: number,
    customers: DebtTicketCustomerInput[]
  ): Promise<DebtTicket> =>
    apiClient.post(`/debt-tickets/${id}/customers`, { customers }),

  updateLine: (
    id: number,
    customerId: number,
    payload: {
      minimumPayment?: number;
      confirmedAmount?: number;
      confirmedDate?: string;
      note?: string;
      status?: DebtTicketLineStatus;
    }
  ): Promise<DebtTicket> =>
    apiClient.patch(`/debt-tickets/${id}/customers/${customerId}`, payload),

  removeCustomer: (
    id: number,
    customerId: number
  ): Promise<{ message: string }> =>
    apiClient.delete(`/debt-tickets/${id}/customers/${customerId}`),

  /** Kết thúc phiếu thủ công. finalStatus: DONE (đã xong) | ENDED (dừng). */
  close: (
    id: number,
    reason: string,
    finalStatus: "DONE" | "ENDED" = "DONE"
  ): Promise<DebtTicket> =>
    apiClient.post(`/debt-tickets/${id}/close`, { reason, finalStatus }),

  /** Dừng phiếu — không thu được. */
  cancel: (id: number, reason: string): Promise<DebtTicket> =>
    apiClient.post(`/debt-tickets/${id}/cancel`, { reason }),
};
