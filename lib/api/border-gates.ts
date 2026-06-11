import { apiClient } from "@/lib/config/api";

export interface BorderGate {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export const borderGatesApi = {
  getAll: (includeInactive = false) =>
    apiClient.get<BorderGate[]>(
      "/border-gates",
      includeInactive ? { includeInactive: "true" } : undefined
    ),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<BorderGate>("/border-gates", data),

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean }
  ) => apiClient.put<BorderGate>(`/border-gates/${id}`, data),

  remove: (id: number) => apiClient.delete(`/border-gates/${id}`),
};
