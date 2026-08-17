import { apiClient } from "@/lib/config/api";
import type { MoqBasis, MoqSpec, MoqUnit } from "@/lib/utils/moq";

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
  /** MOQ có đơn vị, luôn ở phạm vi PER_LINE. */
  moqValue?: string | number | null;
  moqBasis?: MoqBasis | null;
  moqUnit?: MoqUnit | null;
  moqIncrement?: string | number | null;
  /** Cụm MOQ backend đã chuẩn hoá — dùng thẳng, khỏi tự suy luận. */
  moqSpec?: MoqSpec | null;
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
  /** Giá quy đổi VND theo tỉ giá của chính thời điểm ghi nhận. */
  oldPriceVnd?: number | null;
  newPriceVnd?: number | null;
  currency: string;
  exchangeRate?: string | number | null;
  /** `reference` = sửa giá tham chiếu, `purchase_order` = giá thực tế trên PĐN. */
  eventType?: PriceHistoryEventType;
  /** Mã PĐN với sự kiện `purchase_order`. */
  refCode?: string | null;
  reason?: string | null;
  changedById?: number | null;
  changedByName?: string | null;
  createdAt: string;
  changer?: { id: number; name: string } | null;
}

export type PriceHistoryEventType = "reference" | "purchase_order";
export type PriceCurrencyMode = "native" | "vnd";

/** Một mốc giá trên biểu đồ biến động. */
export interface PriceHistorySeriesPoint {
  id: number;
  factoryProductId: number;
  factory: { id: number; code?: string | null; name: string };
  product: { id: number; code?: string | null; name: string };
  eventType: PriceHistoryEventType;
  refCode?: string | null;
  reason?: string | null;
  nativePrice: number | null;
  vndPrice: number | null;
  /** Giá trị dùng để vẽ, đã chọn theo `currencyMode`. */
  value: number | null;
  currency: string;
  exchangeRate: number | null;
  changedByName?: string | null;
  createdAt: string;
}

export interface PriceHistorySeriesResponse {
  points: PriceHistorySeriesPoint[];
  summary: {
    first: number | null;
    latest: number | null;
    min: number | null;
    max: number | null;
    change: number | null;
    changePercent: number | null;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  currencyMode: PriceCurrencyMode;
}

export interface PriceHistorySeriesParams {
  productId: number;
  factoryIds?: number[];
  from?: string;
  to?: string;
  currencyMode?: PriceCurrencyMode;
  eventType?: PriceHistoryEventType;
  page?: number;
  limit?: number;
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
  moqValue?: number | null;
  moqBasis?: MoqBasis | null;
  moqUnit?: MoqUnit | null;
  moqIncrement?: number | null;
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
  /** MOQ cấp dòng (mapping SP × nhà máy). */
  moqSpec?: MoqSpec | null;
  /** MOQ cấp nhà máy — ràng buộc độc lập, thường là toàn đơn. */
  factoryMoqSpec?: MoqSpec | null;
  /** Dữ liệu quy đổi gói lẻ → thùng / kg / tấn. */
  conversionValue?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  priceUpdatedAt: string | null;
}

export interface FactoryProductImportPreview {
  total: number;
  valid: number;
  invalid: number;
  create: number;
  update: number;
  rows: Array<{
    row: number;
    productCode: string;
    factoryCode: string;
    product: { code: string; name: string } | null;
    factory: { code: string | null; name: string } | null;
    action: "create" | "update" | "error";
    errors: string[];
  }>;
}

export interface FactoryProductImportResult {
  total: number;
  created: number;
  updated: number;
}

export const factoryProductsApi = {
  importPreview: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.postForm<FactoryProductImportPreview>(
      "/factory-products/import/preview",
      data
    );
  },

  importCommit: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return apiClient.postForm<FactoryProductImportResult>(
      "/factory-products/import",
      data
    );
  },

  importTemplateUrl: "/factory-products/import/template",

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
   * Chuỗi biến động giá của 1 sản phẩm, gộp mọi nhà máy được chọn.
   * Backend đã sắp xếp tăng dần theo thời gian nên dùng thẳng để vẽ biểu đồ.
   */
  getPriceHistorySeries: (params: PriceHistorySeriesParams) => {
    const query: Record<string, string | number> = {
      productId: params.productId,
    };
    if (params.factoryIds?.length)
      query.factoryIds = params.factoryIds.join(",");
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.currencyMode) query.currencyMode = params.currencyMode;
    if (params.eventType) query.eventType = params.eventType;
    if (params.page != null) query.page = params.page;
    if (params.limit != null) query.limit = params.limit;
    return apiClient.get<PriceHistorySeriesResponse>(
      "/factory-products/price-history/series",
      query
    );
  },

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
