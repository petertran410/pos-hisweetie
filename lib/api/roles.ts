import { apiClient } from "@/lib/config/api";

export interface Role {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const rolesApi = {
  getAll: () => {
    return apiClient.get("/roles");
  },

  getOne: (id: number) => {
    return apiClient.get(`/roles/${id}`);
  },

  create: (data: { name: string; description?: string }) => {
    return apiClient.post("/roles", data);
  },

  update: (id: number, data: { name?: string; description?: string }) => {
    return apiClient.put(`/roles/${id}`, data);
  },

  delete: (id: number) => {
    return apiClient.delete(`/roles/${id}`);
  },

  assignPermissions: (id: number, permissionIds: number[]) => {
    return apiClient.put(`/roles/${id}/permissions`, { permissionIds });
  },
};
