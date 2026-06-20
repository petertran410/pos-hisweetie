import { apiClient } from "@/lib/config/api";

export interface Invoice {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  priceBookId?: number | null;
  priceBookName?: string | null;
  purchaseDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  status: number;
  statusValue?: string;
  usingCod: boolean;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  customer?: any;
  branch?: any;
  soldBy?: any;
  creator?: any;
  details?: any[];
  payments?: any[];
  delivery?: any;
}

export interface InvoicesResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface InvoicesTotalsResponse {
  count: number;
  totalAmount: number;
  grandTotal: number;
  customerDebt: number;
  paidAmount: number;
  debtAmount: number;
  returnOrderAmount: number;
  cashRefundAmount: number;
  debtOffsetAmount: number;
  remainingAmount: number;
}

export interface InvoiceVat extends Invoice {
  vat?: {
    totalPreTax: number;
    totalVat: number;
    totalAfterTax: number;
  };
  missingMisaCode?: boolean;
  misaSyncStatus?: "PENDING" | "SYNCED" | "FAILED" | "SKIP";
  misaSyncRetries?: number;
  misaSyncedAt?: string | null;
  misaOrgRefId?: string | null;
  misaConfirmed?: boolean;
  misaErrorMessage?: string | null;
}

export interface InvoicesVatResponse {
  data: InvoiceVat[];
  total: number;
}

export interface InvoicesVatTotalsResponse {
  count: number;
  totalPreTax: number;
  totalVat: number;
  totalAfterTax: number;
}

export const invoicesApi = {
  getInvoices: (params?: any): Promise<InvoicesResponse> => {
    return apiClient.get("/invoices", params);
  },
  /**
   * Tổng các cột tiền của TOÀN BỘ hóa đơn match filter (không phân trang).
   * Dùng cho hàng "tổng" hiển thị ngay dưới header bảng hóa đơn.
   */
  getTotals: (params?: any): Promise<InvoicesTotalsResponse> => {
    return apiClient.get("/invoices/totals", params);
  },
  getInvoice: (id: number): Promise<Invoice> => {
    return apiClient.get(`/invoices/${id}`);
  },
  getInvoicePayments: async (invoiceId: number) => {
    const response = await apiClient.get(
      `/invoices/${invoiceId}/payment-history`
    );
    return response;
  },
  createInvoice: (data: any): Promise<Invoice> => {
    return apiClient.post("/invoices", data);
  },
  updateInvoice: (id: number, data: any): Promise<Invoice> => {
    return apiClient.put(`/invoices/${id}`, data);
  },
  deleteInvoice: (id: number): Promise<void> => {
    return apiClient.delete(`/invoices/${id}`);
  },
  createInvoiceFromOrder: (
    orderId: number,
    additionalPayment?: number,
    items?: any[],
    payments?: Array<{ method: string; amount: number }>,
    soldById?: number,
    forceComplete?: boolean
  ): Promise<Invoice> => {
    return apiClient.post(`/invoices/from-order/${orderId}`, {
      additionalPayment: additionalPayment || 0,
      items: items || [],
      payments: payments || [],
      forceComplete: forceComplete ?? false,
      ...(soldById ? { soldById } : {}),
    });
  },
  getInvoicesForReturnOrder: (params: {
    search?: string;
    branchId?: number;
    limit?: number;
  }): Promise<any[]> => {
    return apiClient.get("/invoices/for-return-order", params);
  },
  getInvoicesForPacking: (params?: {
    branchId?: number;
    pageSize?: number;
    search?: string;
    excludeDelivered?: boolean;
  }): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> => {
    return apiClient.get("/invoices/for-packing", params);
  },
  getDeliveryOverview: (params?: {
    branchId?: number;
    date?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    pageSize?: number;
    currentItem?: number;
  }): Promise<{
    stats: { total: number; delivered: number; pending: number };
    data: Array<{
      id: number;
      code: string;
      status: number;
      statusValue: string | null;
      branchId: number;
      grandTotal: number;
      createdAt: string;
      customer: { id: number; name: string } | null;
    }>;
    total: number;
  }> => {
    return apiClient.get("/invoices/delivery-overview", params);
  },
  getInvoicesVat: (params?: any): Promise<InvoicesVatResponse> => {
    return apiClient.get("/invoices/vat", params);
  },
  getVatTotals: (params?: any): Promise<InvoicesVatTotalsResponse> => {
    return apiClient.get("/invoices/vat/totals", params);
  },
};
