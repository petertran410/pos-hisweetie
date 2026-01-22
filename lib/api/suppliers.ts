import { apiClient } from "@/lib/config/api";
import { Supplier, SupplierGroup, SupplierFilters } from "@/lib/types/supplier";

export interface SuppliersResponse {
  data: Supplier[];
  total: number;
  pageSize: number;
  currentItem: number;
}

export const suppliersApi = {
  getSuppliers: (params?: SupplierFilters): Promise<SuppliersResponse> => {
    return apiClient.get("/suppliers", params);
  },

  getSupplier: (id: number): Promise<Supplier> => {
    return apiClient.get(`/suppliers/${id}`);
  },

  getSupplierByCode: (code: string): Promise<Supplier> => {
    return apiClient.get(`/suppliers/code/${code}`);
  },

  createSupplier: (data: Partial<Supplier>): Promise<Supplier> => {
    return apiClient.post("/suppliers", data);
  },

  updateSupplier: (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    return apiClient.put(`/suppliers/${id}`, data);
  },

  deleteSupplier: (id: number): Promise<void> => {
    return apiClient.delete(`/suppliers/${id}`);
  },
};

export const supplierGroupsApi = {
  getSupplierGroups: (): Promise<{ data: SupplierGroup[] }> => {
    return apiClient.get("/supplier-groups");
  },

  getSupplierGroup: (id: number): Promise<SupplierGroup> => {
    return apiClient.get(`/supplier-groups/${id}`);
  },

  createSupplierGroup: (data: {
    name: string;
    description?: string;
  }): Promise<SupplierGroup> => {
    return apiClient.post("/supplier-groups", data);
  },

  updateSupplierGroup: (
    id: number,
    data: { name?: string; description?: string }
  ): Promise<SupplierGroup> => {
    return apiClient.put(`/supplier-groups/${id}`, data);
  },

  deleteSupplierGroup: (id: number): Promise<void> => {
    return apiClient.delete(`/supplier-groups/${id}`);
  },
};
