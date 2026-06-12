import { apiClient } from "@/lib/config/api";

export interface InternalUseDetail {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  quantity: number;
  cost: number;
  value: number;
}

export interface InternalUsePurpose {
  id: number;
  name: string;
  order: number;
  isDeleted?: boolean;
}

export interface InternalUse {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  status: number;
  transDate?: string;
  purposeId: number;
  purpose?: InternalUsePurpose;
  userId?: number | null;
  userName?: string | null;
  createdById: number;
  createdByName: string;
  description?: string;
  totalValue: number;
  details: InternalUseDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface InternalUseQueryParams {
  branchIds?: number[];
  status?: number[];
  pageSize?: number;
  currentItem?: number;
  fromDate?: string;
  toDate?: string;
  createdById?: number;
  userId?: number;
  purposeId?: number;
  // Backend lọc theo `code` (mã phiếu) khi truyền `search`.
  search?: string;
}

export interface CreateInternalUseData {
  code?: string;
  branchId: number;
  purposeId: number;
  userId?: number;
  isDraft?: boolean;
  description?: string;
  internalUseDetails: {
    productId: number;
    productCode: string;
    productName: string;
    unit?: string;
    quantity: number;
    cost?: number;
  }[];
}

export interface CancelInternalUseData {
  cancelReason?: string;
}

export const internalUsesApi = {
  getAll: (params?: InternalUseQueryParams) =>
    apiClient.get<{
      total: number;
      pageSize: number;
      totalValue: number;
      data: InternalUse[];
    }>("/internal-use", params),

  getById: (id: number) => apiClient.get<InternalUse>(`/internal-use/${id}`),

  getPurposes: () =>
    apiClient.get<InternalUsePurpose[]>("/internal-use-purposes"),

  createPurpose: (data: { name: string; order?: number }) =>
    apiClient.post<InternalUsePurpose>("/internal-use-purposes", data),

  updatePurpose: (id: number, data: { name?: string; order?: number }) =>
    apiClient.put<InternalUsePurpose>(`/internal-use-purposes/${id}`, data),

  deletePurpose: (id: number) =>
    apiClient.delete(`/internal-use-purposes/${id}`),

  create: (data: CreateInternalUseData) =>
    apiClient.post<InternalUse>("/internal-use", data),

  update: (id: number, data: Partial<CreateInternalUseData> & { status?: number }) =>
    apiClient.put<InternalUse>(`/internal-use/${id}`, data),

  complete: (id: number) =>
    apiClient.post<InternalUse>(`/internal-use/${id}/complete`, {}),

  cancel: (id: number, data?: CancelInternalUseData) =>
    apiClient.put(`/internal-use/${id}/cancel`, data || {}),
};
