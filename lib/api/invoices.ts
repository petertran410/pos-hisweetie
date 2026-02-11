import { apiClient } from "@/lib/config/api";

export interface Invoice {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
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

export const invoicesApi = {
  getInvoices: (params?: any): Promise<InvoicesResponse> => {
    return apiClient.get("/invoices", params);
  },
  getInvoice: (id: number): Promise<Invoice> => {
    return apiClient.get(`/invoices/${id}`);
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
    items?: any[]
  ): Promise<Invoice> => {
    return apiClient.post(`/invoices/from-order/${orderId}`, {
      additionalPayment: additionalPayment || 0,
      items: items || [],
    });
  },
};
