import { apiClient } from "@/lib/config/api";

export interface ProductionStage {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export const productionStagesApi = {
  getAll: (includeInactive = false) =>
    apiClient.get<ProductionStage[]>(
      "/production-stages",
      includeInactive ? { includeInactive: "true" } : undefined
    ),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<ProductionStage>("/production-stages", data),

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean }
  ) => apiClient.put<ProductionStage>(`/production-stages/${id}`, data),

  remove: (id: number) => apiClient.delete(`/production-stages/${id}`),
};
