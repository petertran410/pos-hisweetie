import { apiClient } from "@/lib/config/api";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import type { MoqBasis, MoqScope, MoqUnit } from "@/lib/utils/moq";

export interface Factory {
  id: number;
  code?: string | null;
  name: string;
  fullName?: string | null;
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
  /** MOQ có đơn vị — xem `lib/utils/moq.ts`. */
  moqValue?: string | number | null;
  moqBasis?: MoqBasis | null;
  moqUnit?: MoqUnit | null;
  moqScope?: MoqScope | null;
  moqIncrement?: string | number | null;
  /** Khoảng thời gian sản xuất dùng cho dự kiến đặt hàng. */
  productionLeadtimeMin?: number | null;
  productionLeadtimeMax?: number | null;
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
    orderSupplierItems?: number;
    factoryProducts?: number;
  };
  /** Số sản phẩm theo vai trò, tính từ mapping nhiều-nhiều. */
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
  fullName?: string | null;
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
  moqValue?: number | null;
  moqBasis?: MoqBasis | null;
  moqUnit?: MoqUnit | null;
  moqScope?: MoqScope | null;
  moqIncrement?: number | null;
  productionLeadtimeMin?: number | null;
  productionLeadtimeMax?: number | null;
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

export interface FactoryImportPreview {
  total: number;
  valid: number;
  invalid: number;
  create: number;
  update: number;
  rows: Array<{
    row: number;
    code?: string;
    resolvedCode?: string;
    name: string;
    supplier: { id: number; code: string | null; name: string } | null;
    action: "create" | "update" | "error";
    errors: string[];
  }>;
}

export interface FactoryImportResult {
  total: number;
  created: number;
  updated: number;
}

export const factoriesApi = {
  importPreview: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.postForm<FactoryImportPreview>(
      "/factories/import/preview",
      data
    );
  },

  importCommit: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.postForm<FactoryImportResult>("/factories/import", data);
  },

  importTemplateUrl: "/factories/import/template",

  /** Build query string chung cho các API xuất Excel danh sách nhà máy. */
  _exportQuery: (params?: FactoryQueryParams) => {
    const url = new URL(`${API_URL}/factories/export`);
    if (params?.supplierId != null)
      url.searchParams.set("supplierId", String(params.supplierId));
    if (params?.country) url.searchParams.set("country", params.country);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.includeInactive) url.searchParams.set("includeInactive", "true");
    return url;
  },

  /** Xuất danh sách nhà máy theo đúng bộ lọc đang áp dụng trên bảng. */
  exportAll: async (params?: FactoryQueryParams) => {
    const url = factoriesApi._exportQuery(params);
    const headers = getAuthHeaders();
    delete headers["Content-Type"];
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error("Không thể xuất danh sách nhà máy");
    return response.blob();
  },

  /**
   * Xuất chi tiết toàn bộ nhà máy theo bộ lọc:
   * sheet "Nhà máy" + sheet "Sản phẩm liên kết" (mỗi dòng = 1 mapping NM-SP).
   */
  exportAllDetail: async (params?: FactoryQueryParams) => {
    const url = factoriesApi._exportQuery(params);
    // Đổi path sang /factories/export/detail, giữ nguyên query.
    url.pathname = url.pathname.replace(/\/export$/, "/export/detail");
    const headers = getAuthHeaders();
    delete headers["Content-Type"];
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error("Không thể xuất chi tiết nhà máy");
    return response.blob();
  },

  exportDetail: async (id: number) => {
    const headers = getAuthHeaders();
    delete headers["Content-Type"];
    const response = await fetch(`${API_URL}/factories/${id}/export`, {
      headers,
    });
    if (!response.ok) throw new Error("Không thể xuất chi tiết nhà máy");
    return response.blob();
  },
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