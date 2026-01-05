import { apiClient } from "@/lib/config/api";
import type { CashFlowsResponse, CashFlow } from "@/lib/types/cashflow";

export const cashflowsApi = {
  getCashFlows: (params?: any): Promise<CashFlowsResponse> => {
    return apiClient.get("/cashflows", params);
  },

  getCashFlow: (id: number): Promise<CashFlow> => {
    return apiClient.get(`/cashflows/${id}`);
  },

  createCashFlow: (data: any): Promise<CashFlow> => {
    return apiClient.post("/cashflows", data);
  },

  updateCashFlow: (id: number, data: any): Promise<CashFlow> => {
    return apiClient.put(`/cashflows/${id}`, data);
  },

  cancelCashFlow: (id: number): Promise<void> => {
    return apiClient.delete(`/cashflows/${id}`);
  },

  createPayment: (data: any): Promise<any> => {
    return apiClient.post("/cashflows/payments", data);
  },

  createCustomerPayment: (data: any): Promise<any> => {
    return apiClient.post("/cashflows/customer-payments", data);
  },
};
