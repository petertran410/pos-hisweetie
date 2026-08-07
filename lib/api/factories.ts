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

  // --- Thông tin thương mại (sheet "Supplier Master") ---
  strategicLevel?: string | null;
  wechat?: string | null;
  email?: string | null;
  moq?: string | number | null;
  leadtimeDays?: number | null;
  paymentTerm?: string | null;

  // --- Logistics (sheet "Logistics & Leadtime") ---
  port?: string | null;
  incoterm?: string | null;
  productionLeadtime?: number | null;
  shippingLeadtime?: number | null;
  customsRisk?: string | null;
  cargoType?: string | null;
  notes?: string | null;

  supplier?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  _count?: {
    primaryForProducts?: number;
    backupForProducts?: number;
    orderSupplierItems?: number;
    factoryProducts?: number;
  };
  /**
   * Số sản phẩm theo vai trò, tính từ bảng mapping FactoryProduct.
   * Đây là nguồn cho cột "SP chính"/"SP backup" — KHÁC `_count.primaryForProducts`
   * (đếm theo Product.primaryFactoryId cũ, chỉ cho phép 1 nhà máy/sản phẩm).
   */
  mappingCounts?: {
    primary: number;
    backup: number;
  };
}

export interface FactoryQueryParams {
  supplierId?: number;
  country?: string;
  search?: string;
  strategicLevel?: string;
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

  // Thông tin thương mại (sheet "Supplier Master")
  strategicLevel?: string | null;
  wechat?: string | null;
  email?: string | null;
  moq?: number | null;
  leadtimeDays?: number | null;
  paymentTerm?: string | null;

  // Logistics (sheet "Logistics & Leadtime")
  port?: string | null;
  incoterm?: string | null;
  productionLeadtime?: number | null;
  shippingLeadtime?: number | null;
  customsRisk?: string | null;
  cargoType?: string | null;
  notes?: string | null;
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
    if (params?.strategicLevel) query.strategicLevel = params.strategicLevel;
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