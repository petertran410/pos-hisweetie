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
    soldById?: number
  ): Promise<Invoice> => {
    return apiClient.post(`/invoices/from-order/${orderId}`, {
      additionalPayment: additionalPayment || 0,
      items: items || [],
      payments: payments || [],
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
  }): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> => {
    return apiClient.get("/invoices/for-packing", params);
  },
};
