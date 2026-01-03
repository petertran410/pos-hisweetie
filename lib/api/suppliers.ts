import { apiClient } from "@/lib/config/api";

export interface Supplier {
  id: number;
  code?: string;
  name: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  comments?: string;
  totalDebt: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersResponse {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export const suppliersApi = {
  getSuppliers: (params?: any): Promise<SuppliersResponse> => {
    return apiClient.get("/suppliers", params);
  },

  getSupplier: (id: number): Promise<Supplier> => {
    return apiClient.get(`/suppliers/${id}`);
  },

  createSupplier: (data: any): Promise<Supplier> => {
    return apiClient.post("/suppliers", data);
  },

  updateSupplier: (id: number, data: any): Promise<Supplier> => {
    return apiClient.put(`/suppliers/${id}`, data);
  },

  deleteSupplier: (id: number): Promise<void> => {
    return apiClient.delete(`/suppliers/${id}`);
  },
};
