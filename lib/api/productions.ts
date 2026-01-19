import { apiClient } from "@/lib/config/api";

export interface Production {
  id: number;
  code: string;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  totalCost: number;
  note?: string;
  status: number;
  createdById: number;
  createdByName: string;
  autoDeductComponents: boolean;
  manufacturedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionQueryParams {
  branchIds?: number[];
  status?: number[];
  fromManufacturedDate?: string;
  toManufacturedDate?: string;
  pageSize?: number;
  currentItem?: number;
  search?: string;
}

export interface CreateProductionData {
  code?: string;
  sourceBranchId: number;
  destinationBranchId: number;
  productId: number;
  quantity: number;
  note?: string;
  status?: number;
  manufacturedDate?: string;
  autoDeductComponents?: boolean;
}

export const productionsApi = {
  getAll: (params?: ProductionQueryParams) =>
    apiClient.get<{ total: number; pageSize: number; data: Production[] }>(
      "/productions",
      params
    ),

  getById: (id: number) => apiClient.get<Production>(`/productions/${id}`),

  create: (data: CreateProductionData) =>
    apiClient.post<Production>("/productions", data),

  update: (id: number, data: Partial<CreateProductionData>) =>
    apiClient.put<Production>(`/productions/${id}`, data),

  delete: (id: number) => apiClient.delete(`/productions/${id}`),
};
