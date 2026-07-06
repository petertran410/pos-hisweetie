import { apiClient } from "@/lib/config/api";

export interface Factory {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  country?: string | null;
  currency?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  supplierId?: number | null;
  isActive: boolean;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  supplier?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  _count?: {
    primaryForProducts?: number;
    backupForProducts?: number;
    orderSupplierItems?: number;
  };
}

export interface FactoryQueryParams {
  supplierId?: number;
  country?: string;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  orderBy?: "name" | "code" | "createdAt";
  orderDirection?: "asc" | "desc";
}

export interface FactoryPayload {
  code?: string | null;
  name: string;
  description?: string | null;
  country?: string | null;
  currency?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  supplierId?: number | null;
  isActive?: boolean;
}

export interface FactoryProductsResponse {
  primary: Array<{
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    images?: Array<{ image: string }>;
  }>;
  backup: Array<{
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    images?: Array<{ image: string }>;
  }>;
}

export const factoriesApi = {
  getAll: (params?: FactoryQueryParams | boolean) => {
    // Backward compatible: nếu truyền boolean thì dùng như includeInactive cũ
    if (typeof params === "boolean") {
      return apiClient.get<{ data: Factory[]; total: number; page: number; limit: number }>(
        "/factories",
        params ? { includeInactive: "true" } : undefined
      );
    }
    const query: Record<string, string | number> = {};
    if (params?.supplierId != null) query.supplierId = params.supplierId;
    if (params?.country) query.country = params.country;
    if (params?.search) query.search = params.search;
    if (params?.includeInactive) query.includeInactive = "true";
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.limit = params.limit;
    if (params?.orderBy) query.orderBy = params.orderBy;
    if (params?.orderDirection) query.orderDirection = params.orderDirection;
    return apiClient.get<{ data: Factory[]; total: number; page: number; limit: number }>(
      "/factories",
      query
    );
  },

  getBySupplier: (supplierId: number) =>
    apiClient.get<Factory[]>("/factories/by-supplier/" + supplierId),

  getProducts: (factoryId: number) =>
    apiClient.get<FactoryProductsResponse>(
      `/factories/${factoryId}/products`
    ),

  getById: (id: number) => apiClient.get<Factory>(`/factories/${id}`),

  create: (data: FactoryPayload) =>
    apiClient.post<Factory>("/factories", data),

  update: (id: number, data: Partial<FactoryPayload>) =>
    apiClient.put<Factory>(`/factories/${id}`, data),

  remove: (id: number) => apiClient.delete(`/factories/${id}`),
};