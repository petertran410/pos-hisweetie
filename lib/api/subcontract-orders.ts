import { apiClient } from "@/lib/config/api";
import type {
  MaterialAtFactoryRow,
  MaterialSuggestion,
  SubcontractCostInput,
  SubcontractCostPreview,
  SubcontractOrder,
  SubcontractOrderFilters,
  SubcontractOrderInput,
  SubcontractPaymentInput,
} from "@/lib/types/subcontract-order";

const BASE = "/subcontract-orders";

export const subcontractOrdersApi = {
  getAll: (params?: SubcontractOrderFilters) =>
    apiClient.get<{
      total: number;
      pageSize: number;
      data: SubcontractOrder[];
    }>(BASE, params),

  getById: (id: number) => apiClient.get<SubcontractOrder>(`${BASE}/${id}`),

  getMaterialSuggestions: (params: {
    productId: number;
    formulaId?: number;
    quantity: number;
    branchId: number;
  }) =>
    apiClient.get<MaterialSuggestion[]>(`${BASE}/material-suggestions`, params),

  getAtFactory: (params?: {
    supplierId?: number;
    factoryId?: number;
    productId?: number;
  }) =>
    apiClient.get<{ data: MaterialAtFactoryRow[]; totalValue: number | null }>(
      `${BASE}/at-factory`,
      params,
    ),

  create: (data: SubcontractOrderInput) =>
    apiClient.post<SubcontractOrder>(BASE, data),

  update: (id: number, data: Partial<SubcontractOrderInput>) =>
    apiClient.put<SubcontractOrder>(`${BASE}/${id}`, data),

  send: (
    id: number,
    data: {
      sentDate?: string;
      materials?: { id: number; sentQuantity: number }[];
    },
  ) => apiClient.post<SubcontractOrder>(`${BASE}/${id}/send`, data),

  createReceipt: (
    id: number,
    data: {
      receivedDate?: string;
      goodQuantity: number;
      defectQuantity?: number;
      note?: string;
    },
  ) => apiClient.post<SubcontractOrder>(`${BASE}/${id}/receipts`, data),

  cancelReceipt: (id: number, receiptId: number) =>
    apiClient.post<SubcontractOrder>(
      `${BASE}/${id}/receipts/${receiptId}/cancel`,
      {},
    ),

  addCost: (id: number, data: SubcontractCostInput) =>
    apiClient.post<SubcontractOrder>(`${BASE}/${id}/costs`, data),

  updateCost: (id: number, costId: number, data: SubcontractCostInput) =>
    apiClient.put<SubcontractOrder>(`${BASE}/${id}/costs/${costId}`, data),

  removeCost: (id: number, costId: number) =>
    apiClient.delete<SubcontractOrder>(`${BASE}/${id}/costs/${costId}`),

  complete: (
    id: number,
    data: {
      completedDate?: string;
      materials?: { id: number; returnedQuantity: number }[];
    },
  ) => apiClient.post<SubcontractOrder>(`${BASE}/${id}/complete`, data),

  cancel: (id: number, data: { reason?: string; cancelPayments?: boolean }) =>
    apiClient.post<SubcontractOrder>(`${BASE}/${id}/cancel`, data),

  getCostPreview: (id: number) =>
    apiClient.get<SubcontractCostPreview>(`${BASE}/${id}/cost-preview`),

  applyCost: (
    id: number,
    data: {
      newCost: number;
      scope?: "receiveBranch" | "allBranches";
      expectedOldCost?: number;
    },
  ) => apiClient.post<SubcontractCostPreview>(`${BASE}/${id}/apply-cost`, data),

  createPayment: (id: number, data: SubcontractPaymentInput) =>
    apiClient.post(`${BASE}/${id}/payments`, data),

  removePayment: (id: number, paymentId: number) =>
    apiClient.delete(`${BASE}/${id}/payments/${paymentId}`),
};
