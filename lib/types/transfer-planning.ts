/**
 * Type Definitions — Module Dự kiến chuyển kho (Hà Nội → Sài Gòn)
 */

export type AlertLevel = "GREEN" | "YELLOW" | "RED" | "DARK_RED";

export type AlertFilterType = "ALL" | AlertLevel;

export interface CalculationTrace {
  avg5PerDay: number;
  avg30PerDay: number;
  avg90PerDay: number;
  demandPerDay: number;
  safetyStock: number;
  leadtimeDays: number;
  cycleDays: number;
  transferPoint: number;
  availableStockSG: number;
  availableDays: number;
  targetStockSG: number;
  suggestedQuantity: number;
  alert: AlertLevel;
  alertLabel: string;
  alertReason: string;
}

export interface TransferPlanningItem {
  id: number;
  sku: string;
  name: string;
  unit: string;
  parentName?: string;
  middleName?: string;
  childName?: string;
  cargoType?: "COLD" | "NORMAL";
  trademarkId?: number;
  trademarkName?: string;
  stockHN: number;
  stockSG: number;
  inTransit: number;
  pendingTransfer: number;
  committed: number;
  confirmedOrders: number;
  packSize: number;
  sales5: number;
  sales30: number;
  sales90: number;
  computed: CalculationTrace;
}

export interface TransferPlanningSummary {
  totalSku: number;
  needTransferSku: number;
  warningSku: number;
  totalSuggestedQuantity: number;
}

export interface TransferPlanningFilters {
  search?: string;
  alertFilter?: AlertFilterType;

  // ── 5 BỘ LỌC HÀNG HÓA TƯƠNG TỰ /san-pham/danh-sach ──
  parentNames?: string[];      // Loại Hàng (Category Cấp 1)
  middleNames?: string[];      // Nguồn Gốc (Category Cấp 2)
  childNames?: string[];       // Danh Mục (Category Cấp 3)
  cargoType?: "COLD" | "NORMAL" | ""; // Loại vận chuyển (Lạnh / Thường)
  tradeMarkIds?: number[];     // Thương hiệu (include)
  excludeTradeMarkIds?: number[]; // Thương hiệu loại trừ (exclude)

  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface TransferPlanningResponse {
  data: TransferPlanningItem[];
  total: number;
  page: number;
  limit: number;
  summary: TransferPlanningSummary;
}
