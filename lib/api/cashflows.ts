import { apiClient } from "@/lib/config/api";
import type {
  CashFlow,
  CashFlowMutationPayload,
  CashFlowQueryParams,
  CashFlowRelatedPaymentsResponse,
  CashFlowsResponse,
} from "@/lib/types/cashflow";

export const cashflowsApi = {
  getCashFlows: (params?: CashFlowQueryParams): Promise<CashFlowsResponse> => {
    return apiClient.get("/cashflows", params);
  },

  getCashFlow: (id: number): Promise<CashFlow> => {
    return apiClient.get(`/cashflows/${id}`);
  },

  getRelatedInvoicePayments: (
    id: number
  ): Promise<CashFlowRelatedPaymentsResponse> => {
    return apiClient.get(`/cashflows/${id}/invoice-payments`);
  },

  createCashFlow: (data: CashFlowMutationPayload): Promise<CashFlow> => {
    return apiClient.post("/cashflows", data);
  },

  updateCashFlow: (
    id: number,
    data: CashFlowMutationPayload
  ): Promise<CashFlow> => {
    return apiClient.put(`/cashflows/${id}`, data);
  },

  cancelCashFlow: (id: number): Promise<void> => {
    return apiClient.delete(`/cashflows/${id}`);
  },

  createPayment: (
    data: CashFlowMutationPayload
  ): Promise<Record<string, unknown>> => {
    return apiClient.post("/cashflows/payments", data);
  },

  createCustomerPayment: (
    data: CashFlowMutationPayload
  ): Promise<Record<string, unknown>> => {
    return apiClient.post("/cashflows/customer-payments", data);
  },

  createSupplierPayment: (
    data: CashFlowMutationPayload
  ): Promise<Record<string, unknown>> => {
    return apiClient.post("/cashflows/supplier-payments", data);
  },
};
