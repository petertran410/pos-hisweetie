import { apiClient } from "@/lib/config/api";

/**
 * Mapping (nhà máy × sản phẩm) — tương ứng sheet "Product Mapping" trong file
 * Excel quản lý nhà máy.
 *
 * `referencePrice` là giá tham chiếu do người dùng nhập, dùng làm mốc so sánh
 * với đơn giá thực tế mỗi lần đặt hàng nhập. Mỗi lần đổi giá backend tự ghi 1
 * dòng lịch sử.
 */
export interface FactoryProduct {
  id: number;
  factoryId: number;
  productId: number;
  role: "primary" | "backup";
  priority: number;
  referencePrice?: string | number | null;
  currency: string;
  exchangeRate?: string | number | null;
  isManualRate: boolean;
  moq?: string | number | null;
  leadtimeDays?: number | null;
  note?: string | null;
  isActive: boolean;
  priceUpdatedAt?: string | null;
  priceUpdatedById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  /** Giá tham chiếu quy đổi VND — backend tính, chỉ để hiển thị/so sánh. */
  referencePriceVnd?: number | null;
  product?: {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    images?: Array<{ image: string }>;
  };
  factory?: {
    id: number;
    code?: string | null;
    name: string;
    country?: string | null;
    currency?: string | null;
    supplierId?: number | null;
  };
  priceUpdatedBy?: { id: number; name: string } | null;
}

export interface FactoryProductPriceHistory {
  id: number;
  factoryProductId: number;
  oldPrice?: string | number | null;
  newPrice?: string | number | null;
  currency: string;
  exchangeRate?: string | number | null;
  reason?: string | null;
  changedById?: number | null;
  changedByName?: string | null;
  createdAt: string;
  changer?: { id: number; name: string } | null;
}

export interface FactoryProductPayload {
  factoryId: number;
  productId: number;
  role?: "primary" | "backup";
  priority?: number;
  referencePrice?: number | null;
  currency?: string;
  /** Bỏ trống để backend tự lấy tỉ giá mới nhất từ API. */
  exchangeRate?: number | null;
  isManualRate?: boolean;
  moq?: number | null;
  leadtimeDays?: number | null;
  note?: string | null;
  isActive?: boolean;
  /** Lý do đổi giá — không bắt buộc, chỉ ghi vào lịch sử. */
  reason?: string | null;
}

export interface FactoryProductQueryParams {
  factoryId?: number;
  productId?: number;
  role?: "primary" | "backup";
  includeInactive?: boolean;
}

/** Giá tham chiếu gọn cho form đặt hàng nhập. */
export interface ReferencePriceInfo {
  factoryProductId: number;
  factoryId: number;
  factoryName: string;
  referencePrice: number | null;
  currency: string;
  exchangeRate: number | null;
  referencePriceVnd: number | null;
  moq: number | null;
  priceUpdatedAt: string | null;
}

export const factoryProductsApi = {
  getAll: (params?: FactoryProductQueryParams) => {
    const query: Record<string, string | number> = {};
    if (params?.factoryId != null) query.factoryId = params.factoryId;
    if (params?.productId != null) query.productId = params.productId;
    if (params?.role) query.role = params.role;
    if (params?.includeInactive) query.includeInactive = "true";
    return apiClient.get<FactoryProduct[]>("/factory-products", query);
  },

  getById: (id: number) =>
    apiClient.get<FactoryProduct>(`/factory-products/${id}`),

  getPriceHistory: (id: number) =>
    apiClient.get<FactoryProductPriceHistory[]>(
      `/factory-products/${id}/price-history`
    ),

  /**
   * Giá tham chiếu theo productId. Truyền `factoryId` để khóa 1 nhà máy, hoặc
   * `supplierId` để lấy theo mọi nhà máy của NCC đó.
   */
  getReferencePrices: (
    productIds: number[],
    opts?: { supplierId?: number; factoryId?: number }
  ) => {
    const query: Record<string, string | number> = {
      productIds: productIds.join(","),
    };
    if (opts?.supplierId != null) query.supplierId = opts.supplierId;
    if (opts?.factoryId != null) query.factoryId = opts.factoryId;
    return apiClient.get<Record<number, ReferencePriceInfo | null>>(
      "/factory-products/reference-prices",
      query
    );
  },

  create: (data: FactoryProductPayload) =>
    apiClient.post<FactoryProduct>("/factory-products", data),

  update: (id: number, data: Partial<FactoryProductPayload>) =>
    apiClient.put<FactoryProduct>(`/factory-products/${id}`, data),

  remove: (id: number) => apiClient.delete(`/factory-products/${id}`),
};
