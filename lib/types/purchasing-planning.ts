/**
 * API Contract — Module Purchasing Planning (Dự kiến đặt hàng)
 *
 * Đây là NGUỒN SỰ THẬT CHUNG giữa frontend và backend.
 * Mọi thay đổi phải đồng bộ cả 2 phía.
 *
 * Tham chiếu:
 *   - Nghiệp vụ : docs/purchasing-planning-prd.md
 *   - Kỹ thuật  : docs/purchasing-planning-technical-design.md §8 (API Design)
 *
 * QUY ƯỚC QUAN TRỌNG:
 *   - Mọi số lượng tính theo ĐƠN VỊ CƠ BẢN (gói/chai/túi), kèm quy đổi thùng
 *     để hiển thị (PRD §4.3).
 *   - Frontend KHÔNG chứa business logic. Mọi con số (priority, summaryText,
 *     suggestedQuantity...) đều do backend tính và trả về.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUM & VALUE OBJECT
// ═══════════════════════════════════════════════════════════════════════════

/** Mức độ ưu tiên 7 bậc — PRD §10.3 */
export const PRIORITY_LEVEL = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  HEALTHY: "HEALTHY",
  OVERSTOCK: "OVERSTOCK",
  NO_DATA: "NO_DATA",
} as const;

export type PriorityLevel =
  (typeof PRIORITY_LEVEL)[keyof typeof PRIORITY_LEVEL];

/** Thứ hạng để sắp xếp — càng nhỏ càng khẩn cấp */
export const PRIORITY_RANK: Record<PriorityLevel, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  HEALTHY: 5,
  OVERSTOCK: 6,
  NO_DATA: 7,
};

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  CRITICAL: "Khẩn cấp",
  HIGH: "Đặt ngay",
  MEDIUM: "Đợt tới",
  LOW: "Theo dõi",
  HEALTHY: "Ổn định",
  OVERSTOCK: "Tồn dư",
  NO_DATA: "Thiếu dữ liệu",
};

/** Độ tin cậy của forecast — PRD §5.4 */
export const CONFIDENCE_LEVEL = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  VERY_LOW: "VERY_LOW",
  NO_DATA: "NO_DATA",
} as const;

export type ConfidenceLevel =
  (typeof CONFIDENCE_LEVEL)[keyof typeof CONFIDENCE_LEVEL];

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp",
  VERY_LOW: "Rất thấp",
  NO_DATA: "Không có dữ liệu",
};

/** Độ tin cậy tổng hợp của đề xuất — PRD §11.3 */
export const RELIABILITY_LEVEL = {
  RELIABLE: "RELIABLE",
  CAUTION: "CAUTION",
  UNRELIABLE: "UNRELIABLE",
  BLOCKED: "BLOCKED",
} as const;

export type ReliabilityLevel =
  (typeof RELIABILITY_LEVEL)[keyof typeof RELIABILITY_LEVEL];

export const RELIABILITY_LABEL: Record<ReliabilityLevel, string> = {
  RELIABLE: "Đáng tin cậy",
  CAUTION: "Cần chú ý",
  UNRELIABLE: "Không đáng tin",
  BLOCKED: "Bị chặn",
};

/** Mức nghiêm trọng của cảnh báo dữ liệu */
export type FlagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Loại ETA của lô hàng đang về — PRD §7.3 */
export type EtaType = "CONFIRMED" | "ESTIMATED" | "OVERDUE";

export const ETA_TYPE_LABEL: Record<EtaType, string> = {
  CONFIRMED: "Đã xác nhận",
  ESTIMATED: "Ước tính",
  OVERDUE: "Quá hạn",
};

/** Nguồn cung cấp giá trị cấu hình — PRD §14.1 */
export type ConfigSource =
  | "GLOBAL"
  | "CATEGORY"
  | "SUPPLIER"
  | "SKU"
  | "PRODUCT"
  | "DERIVED";

export const CONFIG_SOURCE_LABEL: Record<ConfigSource, string> = {
  GLOBAL: "Mặc định toàn hệ thống",
  CATEGORY: "Theo nhóm hàng",
  SUPPLIER: "Theo nhà cung cấp",
  SKU: "Cấu hình riêng SKU",
  PRODUCT: "Sản phẩm · Định lượng đóng gói",
  DERIVED: "Tự học từ lịch sử",
};

/**
 * Tham số duy nhất còn cần khai bằng tay.
 *
 * Những thứ đã được tính tự động, không còn cấu hình ở đây:
 *  - `leadTimeDays`: từ chuỗi Sản xuất → Thông quan → Về kho gốc → Điều chuyển
 *  - `moq`: từ khai báo ở nhà máy / mapping SKU × nhà máy
 *  - `safetyDays`: suy từ độ dao động doanh số theo tháng
 *  - `growthFactor`: thay bằng đối chiếu khuyến mãi và phát hiện trend
 */
export const PURCHASING_CONFIG_FIELDS = ["coverageDays"] as const;

export type PurchasingConfigField = (typeof PURCHASING_CONFIG_FIELDS)[number];
export type PurchasingConfigScope = "GLOBAL" | "CATEGORY" | "SUPPLIER" | "SKU";

export interface PurchasingConfigEntity {
  id: number;
  code?: string | null;
  name: string;
}

export type PurchasingConfigOverrides = Partial<
  Record<PurchasingConfigField, number>
>;

export type PurchasingConfigPatch = Partial<
  Record<PurchasingConfigField, number | null>
>;

export interface ResolvedPurchasingConfigField {
  value: number;
  source: PurchasingConfigScope;
  sourceLabel: string;
  inherited: boolean;
}

export interface PurchasingConfigGroup {
  id: string;
  scopeType: PurchasingConfigScope;
  scopeId: number | null;
  entity: PurchasingConfigEntity | null;
  /** Chỉ các giá trị được override ở chính scope này. */
  overrides: PurchasingConfigOverrides;
  isActive: boolean;
  updatedAt: string;
}

export interface PurchasingConfigListResponse {
  groups: PurchasingConfigGroup[];
}

export interface ResolvedPurchasingConfig {
  scopeType: PurchasingConfigScope;
  scopeId: number | null;
  entity: PurchasingConfigEntity | null;
  configId: string | null;
  overrides: PurchasingConfigOverrides;
  fields: Partial<Record<PurchasingConfigField, ResolvedPurchasingConfigField>>;
}

export type ResolvedPurchasingConfigQuery = {
  skuId?: number;
  supplierId?: number;
  categoryId?: number;
};

export interface CreatePurchasingConfigRequest extends PurchasingConfigOverrides {
  scopeType: PurchasingConfigScope;
  scopeId?: number;
}

/** Trạng thái của một dòng đề xuất — TD §2.6 */
export type RecommendationItemStatus =
  | "PENDING"
  | "APPROVED"
  | "ADJUSTED"
  | "REJECTED"
  | "ORDERED"
  | "SUPERSEDED"
  | "BLOCKED";

/**
 * Nguồn dữ liệu tính nhu cầu.
 * Quyết định G0: dùng Hybrid — ưu tiên InventoryLog, fallback InvoiceDetail
 * khi InventoryLog chưa đủ dữ liệu cho SKU đó.
 */
export type DemandSource = "INVENTORY_LOG" | "INVOICE_DETAIL" | "HYBRID";

export const DEMAND_SOURCE_LABEL: Record<DemandSource, string> = {
  INVENTORY_LOG: "Sổ cái kho",
  INVOICE_DETAIL: "Hoá đơn bán hàng",
  HYBRID: "Kết hợp",
};

// ═══════════════════════════════════════════════════════════════════════════
// CẢNH BÁO CHẤT LƯỢNG DỮ LIỆU — PRD §11.2
// ═══════════════════════════════════════════════════════════════════════════

export interface DataQualityFlag {
  code: string;
  severity: FlagSeverity;
  /** true → không hiển thị số đề xuất, chỉ hiển thị vấn đề cần xử lý */
  blocksRecommendation: boolean;
  /** Thông điệp tiếng Việt hiển thị cho Buyer */
  message: string;
  /** Dữ liệu bổ trợ (VD: chi nhánh nào âm, âm bao nhiêu) */
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DÒNG ĐỀ XUẤT — dùng ở màn hình DANH SÁCH
// ═══════════════════════════════════════════════════════════════════════════

export type OrderUrgency =
  | "ORDER_NOW"
  | "ORDER_THIS_MONTH"
  | "ORDER_NEXT_MONTH"
  | "ORDER_LATER"
  | "NO_ACTION";

export type DemandStability = "STABLE" | "VOLATILE" | "INSUFFICIENT_DATA";

export interface RecommendationListItem {
  itemId: number;

  // ── Định danh sản phẩm ──
  productId: number;
  productCode: string;
  productName: string;
  /** Đơn vị cơ bản: gói / chai / túi */
  unit: string | null;
  /** Số đơn vị cơ bản trong 1 thùng — dùng quy đổi hiển thị */
  packSize: number;

  // ── Phân loại hàng hoá (phục vụ lọc + hiển thị cột) ──
  /** Loại hàng — category cấp 1 */
  parentName: string | null;
  /** Nguồn gốc — category cấp 2 */
  middleName: string | null;
  /** Danh mục — category cấp 3 */
  childName: string | null;
  tradeMarkId: number | null;
  tradeMarkName: string | null;

  // ── Nhà cung cấp ──
  supplierId: number | null;
  supplierName: string | null;
  /** Tổng leadtime cận trên — dùng làm hạn chót đặt hàng. */
  leadTimeDays: number;
  /** Tổng leadtime cận dưới — đầu nhanh của khoảng. */
  leadTimeMinDays?: number | null;
  leadTimeSource: ConfigSource;

  // ── Thời điểm cần đặt (trả lời "tháng sau có phải đặt không") ──
  orderUrgency?: OrderUrgency | null;
  /** ISO date — chậm nhất phải đặt để hàng kịp về. */
  latestOrderDate?: string | null;

  // ── Độ ổn định doanh số ──
  demandStability?: DemandStability | null;
  /** Hệ số biến thiên doanh số theo tháng — cơ sở tính tồn dự phòng. */
  variationCoefficient?: number | null;

  // ── Phân loại ──
  priority: PriorityLevel;
  priorityRank: number;
  reliability: ReliabilityLevel;

  // ── Tồn kho ──
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  incomingTotal: number;

  // ── Dự báo ──
  forecastDailyDemand: number;
  confidence: ConfidenceLevel;
  /** Chỉ số đối chiếu — hiển thị ở bảng tổng hợp */
  ma30: number | null;
  ma60: number | null;
  ma90: number | null;
  /** ma30 / ma90 — > 1 là xu hướng tăng */
  trendRatio: number | null;

  // ── Chỉ số thời gian ──
  /** null khi forecast = 0 (không xác định được) — PRD §15 Case 10 */
  daysOfSupply: number | null;
  daysUntilStockout: number | null;
  /** ISO date; null nếu không cạn kho trong horizon */
  projectedStockoutDate: string | null;
  /** daysUntilStockout / leadTimeDays — PRD §10.2 */
  urgencyRatio: number | null;

  // ── Ngưỡng đặt hàng ──
  reorderPoint: number;
  inventoryPosition: number;
  /** Dương = thiếu so với ngưỡng = cần đặt */
  reorderGap: number;
  needsOrder: boolean;

  // ── Đề xuất ──
  suggestedQuantity: number;
  /** Quy đổi thùng để hiển thị: suggestedQuantity / packSize */
  suggestedPackCount: number | null;
  estimatedUnitPrice: number | null;
  estimatedValue: number | null;

  // ── Hiển thị ──
  /**
   * Câu kết luận bằng tiếng Việt do BACKEND sinh — PRD §12.4.
   * VD: "Hết sau 4 ngày · Đặt bây giờ về sau 45 ngày → ĐỨT 41 NGÀY"
   * Frontend chỉ render, KHÔNG tự ghép chuỗi.
   */
  summaryText: string;
  flags: DataQualityFlag[];

  status: RecommendationItemStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHI TIẾT SKU — bổ sung cho màn hình CHI TIẾT
// ═══════════════════════════════════════════════════════════════════════════

/** Tồn kho theo từng chi nhánh — PRD §12.5 */
export interface BranchStock {
  branchId: number;
  branchName: string;
  branchCode?: string | null;
  onHand: number;
}

export interface PurchasingBranchScope {
  branches: Array<{
    id: number;
    name: string;
    code: string | null;
  }>;
}

/** Một lô hàng đang về — PRD §7.2 */
export interface IncomingShipmentInfo {
  orderSupplierId: number;
  orderCode: string;
  supplierName: string | null;
  quantity: number;
  /** ISO date */
  eta: string | null;
  etaType: EtaType;
  /** Số ngày quá hạn (chỉ có khi etaType = OVERDUE) */
  overdueDays?: number;
}

/** So sánh 3 cửa sổ forecast — PRD §5.4 */
export interface ForecastComparison {
  /** Giá trị dùng để tính đề xuất */
  used: number;
  /** Cửa sổ thực dùng sau fallback: 90 | 60 | 30 | số ngày thực có */
  windowUsed: number;
  ma30: number | null;
  ma60: number | null;
  ma90: number | null;
  /** ma30 / ma90 — > 1 là xu hướng tăng */
  trendRatio: number | null;
  /** Tổng nhu cầu trong cửa sổ */
  totalDemand: number;
  /** Mẫu số thực tế = số ngày có hàng */
  validDays: number;
  /** Số ngày trong cửa sổ danh nghĩa */
  windowDays: number;
  /** Số ngày bị loại vì hết hàng — PRD §5.5 */
  stockoutDaysExcluded: number;
  /** Hệ số điều chỉnh thủ công — PRD §5.6 */
  growthFactor: number;
  /** Nguồn dữ liệu thực tế đã dùng cho SKU này */
  demandSource: DemandSource;

  // ── Khuyến mãi đang chạy / sắp chạy trong horizon đặt hàng ──
  /** Các đợt đã được cộng thêm nhu cầu vào số lượng đề xuất. */
  upcomingPromotions?: PromotionWindowInfo[];
  /** Số lượng cộng thêm cho các đợt đó. */
  promotionExtraDemand?: number;
  /** Số ngày có khuyến mãi trong horizon, đã khử trùng lặp. */
  promotionDays?: number;
  /** Hệ số bán vượt mức nền, suy từ lịch sử chính SKU này. */
  promotionUpliftFactor?: number;
}

/** Một đợt khuyến mãi đang hoặc sắp chạy. */
export interface PromotionWindowInfo {
  name: string | null;
  /** ISO date */
  startDate: string;
  /** ISO date */
  endDate: string;
}

/** Một bước trong quá trình tính — PRD §13.3 */
export interface CalculationStep {
  step: number;
  name: string;
  /** Công thức dạng chữ, VD: "FDD × leadTime" */
  formula: string;
  /** Giá trị từng biến trong công thức */
  values: Record<string, number>;
  result: number;
  note?: string;
}

/** Giá trị cấu hình kèm nguồn — PRD §13.3 */
export interface ConfigValueWithSource {
  value: number;
  source: ConfigSource;
  label: string;
}

/** Bản ghi đầy đủ quá trình tính — PRD §13.3, TD §12.5 */
export interface CalculationTrace {
  version: string;
  /** ISO datetime */
  computedAt: string;
  inputs: {
    /** Snapshot cũ chưa có field này. */
    branchScope?: PurchasingBranchScope;
    config: {
      leadTimeDays: ConfigValueWithSource;
      safetyDays: ConfigValueWithSource;
      coverageDays: ConfigValueWithSource;
      growthFactor: ConfigValueWithSource;
      packSize: ConfigValueWithSource;
      moq: ConfigValueWithSource;
    };
    inventory: {
      physical: number;
      reserved: number;
      available: number;
      branches: BranchStock[];
    };
    shipments: IncomingShipmentInfo[];
    forecast: ForecastComparison;
  };
  steps: CalculationStep[];
  result: {
    reorderPoint: number;
    inventoryPosition: number;
    reorderGap: number;
    suggestedQuantity: number;
    priority: PriorityLevel;
  };
  flags: DataQualityFlag[];
}

export interface RecommendationDetail extends RecommendationListItem {
  safetyDays: number;
  coverageDays: number;
  leadTimeDemand: number;
  safetyBuffer: number;
  /** SOQ trước khi áp MOQ và làm tròn thùng */
  soqRaw: number;
  moqApplied: number | null;

  branchBreakdown: BranchStock[];
  shipments: IncomingShipmentInfo[];
  forecastComparison: ForecastComparison;
  calculationTrace: CalculationTrace;

  /** ISO date của snapshot */
  snapshotDate: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST — Query params
// ═══════════════════════════════════════════════════════════════════════════

export type RecommendationSortBy =
  | "priority"
  | "stockout"
  | "value"
  | "gap"
  | "code"
  | "name"
  | "supplier"
  | "stock"
  | "available"
  | "incoming"
  | "forecast"
  | "dos"
  | "rop"
  | "position"
  | "soq"
  | "leadtime";

/** Mã cảnh báo chất lượng dữ liệu — PRD §11.2 */
export const FLAG_CODE_LABEL: Record<string, string> = {
  SALES_DATA_STALE: "Dữ liệu bán hàng cũ",
  INVENTORY_STALE: "Tồn kho không biến động",
  SYNC_ERROR: "Lỗi đồng bộ",
  MISSING_LEADTIME: "Thiếu thời gian giao hàng",
  MISSING_SUPPLIER: "Chưa gắn nhà cung cấp",
  MISSING_FORECAST: "Không đủ dữ liệu dự báo",
  NEGATIVE_INVENTORY: "Tồn kho âm",
  LOW_CONFIDENCE_FORECAST: "Dự báo độ tin cậy thấp",
  RESERVED_DATA_UNRELIABLE: "Dữ liệu giữ chỗ chưa đáng tin cậy",
  SHIPMENT_DELAYED: "Lô hàng trễ hẹn",
  SHIPMENT_STALE: "Lô hàng quá hạn lâu",
  SHIPMENT_LATE_ARRIVAL: "Hàng về không kịp",
  MOQ_OVERSHOOT: "Phải đặt vượt nhu cầu (MOQ)",
  EXPIRY_RISK: "Rủi ro hết hạn",
  UNIT_MISMATCH_SUSPECTED: "Nghi ngờ sai đơn vị",
  PRICE_MISSING: "Thiếu giá nhập",
  TREND_SHIFT: "Xu hướng thay đổi mạnh",
  NEW_PRODUCT: "Sản phẩm mới",
  OUT_OF_STOCK: "Đang hết hàng",
  OVERSTOCK: "Tồn kho dư thừa",
  PENDING_CUSTOMER_ORDERS: "Có đơn khách đang chờ",
};

export interface RecommendationFilters {
  /** ISO date; mặc định = snapshot mới nhất */
  date?: string;

  // ── Tìm kiếm ──
  search?: string;

  // ── Mức độ ──
  /** Lọc theo nhiều mức ưu tiên */
  priority?: PriorityLevel[];
  /** Lọc theo độ tin cậy tổng hợp của đề xuất */
  reliability?: ReliabilityLevel[];
  /** Lọc theo độ tin cậy của dự báo */
  confidence?: ConfidenceLevel[];

  // ── Phân loại hàng hoá ──
  /** Loại hàng (category cấp 1) */
  parentNames?: string[];
  /** Nguồn gốc (category cấp 2) */
  middleNames?: string[];
  /** Danh mục (category cấp 3) */
  childNames?: string[];
  tradeMarkIds?: number[];
  /** Cho phép chọn nhiều nhà cung cấp */
  supplierIds?: number[];

  // ── Ngưỡng số ──
  daysUntilStockoutFrom?: number;
  daysUntilStockoutTo?: number;
  daysOfSupplyFrom?: number;
  daysOfSupplyTo?: number;
  estimatedValueFrom?: number;
  estimatedValueTo?: number;

  // ── Cảnh báo & trạng thái ──
  /** true = chỉ hiện SKU có ít nhất 1 cảnh báo */
  hasFlags?: boolean;
  /** Lọc theo mã cảnh báo cụ thể */
  flagCodes?: string[];
  /** true = chỉ hiện SKU bị chặn do chất lượng dữ liệu */
  isBlocked?: boolean;
  status?: RecommendationItemStatus;

  /** Mặc định true — chỉ hiện SKU cần đặt */
  needsOrderOnly?: boolean;

  // ── Phân trang & sắp xếp ──
  page?: number;
  limit?: number;
  sortBy?: RecommendationSortBy;
  sortDir?: "asc" | "desc";

  /** @deprecated dùng `supplierIds` để chọn nhiều NCC */
  supplierId?: number;
  /** @deprecated dùng `childNames` */
  categoryId?: number;
}

/** Chế độ hiển thị danh sách đề xuất */
export type ViewMode = "list" | "table";

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RecommendationListMeta {
  /** ISO date của snapshot đang xem */
  snapshotDate: string;
  /** true khi snapshot quá 26 giờ — TD §12.4 */
  isStale: boolean;
  /** ISO datetime lần tính gần nhất */
  lastRunAt: string | null;
  /** Đếm theo từng mức ưu tiên (trên toàn bộ kết quả, không chỉ trang hiện tại) */
  counts: Record<PriorityLevel, number>;
  totalEstimatedValue: number | null;
}

export interface RecommendationListResponse {
  items: RecommendationListItem[];
  pagination: PaginationMeta;
  meta: RecommendationListMeta;
}

/** Kết quả chạy engine tính đề xuất đặt hàng thủ công. */
export interface RunPurchasingCalculationResult {
  runId: number;
  recommendationId: number;
  status: "COMPLETED";
  snapshotDate: string;
  skuTotal: number;
  skuBlocked: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIỆN ÍCH HIỂN THỊ (thuần trình bày, không phải business logic)
// ═══════════════════════════════════════════════════════════════════════════

/** Màu badge theo mức ưu tiên — chỉ phục vụ hiển thị */
export const PRIORITY_STYLE: Record<
  PriorityLevel,
  { badge: string; dot: string; row?: string }
> = {
  CRITICAL: {
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    row: "bg-red-50/40",
  },
  HIGH: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    row: "bg-orange-50/30",
  },
  MEDIUM: {
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  LOW: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  HEALTHY: {
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  OVERSTOCK: {
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  NO_DATA: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
};

export const SEVERITY_STYLE: Record<FlagSeverity, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

/** Danh sách mức ưu tiên theo thứ tự hiển thị */
export const PRIORITY_ORDER: PriorityLevel[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "HEALTHY",
  "OVERSTOCK",
  "NO_DATA",
];
