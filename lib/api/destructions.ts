import { apiClient } from "@/lib/config/api";

export interface DestructionDetail {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  totalValue: number;
  note?: string;
}

export interface Destruction {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  status: number;
  destructionDate?: string;
  createdById: number;
  createdByName: string;
  note?: string;
  totalValue: number;
  details: DestructionDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface DestructionQueryParams {
  branchIds?: number[];
  status?: number[];
  pageSize?: number;
  currentItem?: number;
  fromDestructionDate?: string;
  toDestructionDate?: string;
  // ⚠️ CẦN BACKEND: backend hiện chưa lọc theo `search`/`code` trên /destructions.
  // Tham số vẫn được gửi lên để link ?Code= hoạt động khi backend bổ sung.
  search?: string;
}

export interface CreateDestructionData {
  branchId: number;
  isDraft?: boolean;
  note?: string;
  destructionDetails: {
    productCode: string;
    productId: number;
    quantity: number;
    price: number;
  }[];
}

export interface CancelDestructionData {
  cancelReason?: string;
}

export const destructionsApi = {
  getAll: (params?: DestructionQueryParams) =>
    apiClient.get<{ total: number; pageSize: number; data: Destruction[] }>(
      "/destructions",
      params
    ),

  getById: (id: number) => apiClient.get<Destruction>(`/destructions/${id}`),

  create: (data: CreateDestructionData) =>
    apiClient.post<Destruction>("/destructions", data),

  update: (id: number, data: Partial<CreateDestructionData>) =>
    apiClient.put<Destruction>(`/destructions/${id}`, data),

  delete: (id: number) => apiClient.delete(`/destructions/${id}`),

  cancel: (id: number, data?: CancelDestructionData) =>
    apiClient.put(`/destructions/${id}/cancel`, data || {}),
};
