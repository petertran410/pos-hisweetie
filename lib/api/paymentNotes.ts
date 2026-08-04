import { apiClient } from "../config/api";

export type PaymentNoteType = "cash" | "transfer";

export const paymentNotesApi = {
  createOrder: (orderId: number, data: { paymentType: PaymentNoteType; amount?: number }) =>
    apiClient.post(`/orders/${orderId}/payment-note`, data),
  createInvoice: (invoiceId: number, data: { paymentType: PaymentNoteType; amount?: number }) =>
    apiClient.post(`/invoices/${invoiceId}/payment-note`, data),
};
