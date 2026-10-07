import { apiClient } from "@/lib/config/api";
import type {
  InternalUseReturn,
  InternalUseReturnable,
} from "@/lib/types/internal-use-return";

export interface InternalUseReturnQuery {
  page?: number;
  limit?: number;
  search?: string;
  internalUseId?: number;
  branchId?: number;
  branchIds?: number[];
  status?: number;
  fromDate?: string;
  toDate?: string;
}

export interface InternalUseReturnListResponse {
  data: InternalUseReturn[];
  total: number;
  page: number;
  limit: number;
}

export const internalUseReturnsApi = {
  getAll: (params?: InternalUseReturnQuery) =>
    apiClient.get<InternalUseReturnListResponse>("/internal-use-returns", params),

  getById: (id: number) =>
    apiClient.get<InternalUseReturn>(`/internal-use-returns/${id}`),

  getReturnable: (internalUseId: number) =>
    apiClient.get<InternalUseReturnable>(
      `/internal-use-returns/returnable/${internalUseId}`
    ),

  create: (data: any) =>
    apiClient.post<InternalUseReturn>("/internal-use-returns", data),

  updateStep1: (id: number, data: any) =>
    apiClient.put<InternalUseReturn>(
      `/internal-use-returns/${id}/update-step1`,
      data
    ),

  confirmStock: (id: number, data: any) =>
    apiClient.put<InternalUseReturn>(
      `/internal-use-returns/${id}/confirm-stock`,
      data
    ),

  cancel: (id: number) =>
    apiClient.put<InternalUseReturn>(`/internal-use-returns/${id}/cancel`, {}),
};

