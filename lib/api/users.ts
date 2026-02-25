import { apiClient } from "@/lib/config/api";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  branchId?: number;
  isActive: boolean;
  roles: Array<{ id: number; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export const usersApi = {
  getAll: (params?: {
    search?: string;
    branchId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => {
    return apiClient.get("/users", { params });
  },

  getUsers: (): Promise<User[]> => {
    return apiClient.get("/users/all");
  },

  getOne: (id: number) => {
    return apiClient.get(`/users/${id}`);
  },

  create: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    branchId?: number;
    roleIds?: number[];
    permissionIds?: number[];
    isActive?: boolean;
  }) => {
    return apiClient.post("/users", data);
  },

  update: (
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      branchId?: number;
      isActive?: boolean;
      roleIds?: number[];
      permissionIds?: number[];
    }
  ) => {
    return apiClient.put(`/users/${id}`, data);
  },

  delete: (id: number) => {
    return apiClient.delete(`/users/${id}`);
  },

  assignPermissions: (id: number, permissionIds: number[]) => {
    return apiClient.put(`/users/${id}/permissions`, { permissionIds });
  },
};
