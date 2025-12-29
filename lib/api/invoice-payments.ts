import { apiClient } from "../config/api";

export interface InvoicePayment {
  id: number;
  code: string;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description: string;
}

export interface CreateInvoicePaymentDto {
  invoiceId: number;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
}

export const invoicePaymentsApi = {
  getPaymentsByInvoice: (invoiceId: number): Promise<InvoicePayment[]> => {
    return apiClient.get(`/invoice-payments/invoice/${invoiceId}`);
  },

  createPayment: (data: CreateInvoicePaymentDto): Promise<InvoicePayment> => {
    return apiClient.post("/invoice-payments", data);
  },

  deletePayment: (id: number): Promise<void> => {
    return apiClient.delete(`/invoice-payments/${id}`);
  },
};
