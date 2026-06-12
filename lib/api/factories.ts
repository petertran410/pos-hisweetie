import { apiClient } from "@/lib/config/api";

export interface Factory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export const factoriesApi = {
  getAll: (includeInactive = false) =>
    apiClient.get<Factory[]>(
      "/factories",
      includeInactive ? { includeInactive: "true" } : undefined
    ),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Factory>("/factories", data),

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean }
  ) => apiClient.put<Factory>(`/factories/${id}`, data),

  remove: (id: number) => apiClient.delete(`/factories/${id}`),
};
