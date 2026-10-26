import { apiClient } from "@/lib/config/api";

export type RangeKey =
  "today" | "yesterday" | "week" | "month" | "lastMonth" | "custom";
export type TopMetric = "rev" | "qty" | "profit";
export type CategoryDimension = "parent" | "middle" | "child";

// Bộ mốc thời gian chi tiết dùng chung cho So sánh chi nhánh & Công nợ/COD.
export type PeriodKey =
  | "today"
  | "yesterday"
  | "d7"
  | "d30"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom"
  | "all";

/**
 * Khoảng ngày tùy chọn (khi range/period = "custom"), dạng "YYYY-MM-DD".
 * Đổi sang ISO theo giờ máy người dùng trước khi gửi backend.
 */
export interface CustomDates {
  from: string;
  to: string;
}

/** Params from/to (ISO) gửi kèm khi chọn "custom"; undefined ở các mốc khác. */
function customParams(key: string, custom?: CustomDates) {
  if (key !== "custom" || !custom?.from || !custom?.to) return {};
  return {
    from: new Date(custom.from + "T00:00:00").toISOString(),
    to: new Date(custom.to + "T23:59:59.999").toISOString(),
  };
}

// Nhãn ngắn (dropdown) và nhãn phụ đề cho từng mốc.
export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  d7: "7 ngày",
  d30: "30 ngày",
  thisWeek: "Tuần này",
  thisMonth: "Tháng này",
  lastMonth: "Tháng trước",
  custom: "Tùy chọn ngày",
  all: "Tất cả",
};

// Danh sách mốc cho dropdown So sánh chi nhánh (không có 'Tất cả').
export const BRANCH_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "d7",
  "d30",
  "thisWeek",
  "thisMonth",
  "lastMonth",
];

// Danh sách mốc cho dropdown Công nợ & COD (có 'Tất cả').
export const FINANCE_PERIODS: PeriodKey[] = [...BRANCH_PERIODS, "all"];

export interface DashboardStats {
  range: RangeKey;
  currentRevenue: number;
  lastRevenue: number;
  revenueChange: number;
  currentMonthOrders: number;
  invoiceCount: number;
  invoiceChange: number;
  aov: number;
  aovChange: number;
  profit: number;
  profitChange: number;
  marginAvg: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  codAmount: number;
  codCount: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  negativeStock: number;
}

export interface TodayStats {
  todayRevenue: number;
  todayOrders: number;
  todayReturns: number;
  todayReturnCount: number;
  todayNetRevenue: number;
  todayInvoiceRevenue: number;
  todayInvoiceCount: number;
}

export interface RevenueChartItem {
  month: string;
  revenue: number;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface CategorySlice {
  name: string;
  revenue: number;
  percent: number;
}

export interface BranchSeries {
  id: number;
  name: string;
  data: number[];
  total: number;
}

export interface BranchComparison {
  labels: string[];
  branches: BranchSeries[];
}

export interface FinanceData {
  finRange: PeriodKey;
  debt: number;
  overdue: number;
  unpaidCount: number;
  codAmount: number;
  codCount: number;
  aging: {
    inTerm: number;
    d1to30: number;
    over30: number;
  };
}

export interface TaskRow {
  code: string;
  partner: string;
  branchName: string;
  value: number;
  time?: string;
  status: string;
  paymentStatus?: string;
  usingCod?: boolean;
  ageDays?: number;
  deliveryStatus?: number;
  invoiceStatus?: number;
  minQuality?: number;
  unit?: string;
}

export interface TopCustomer {
  id: number;
  code: string;
  name: string;
  phone: string;
  totalPurchased: number;
  totalDebt: number;
  orderCount: number;
  customerType: string;
}

/** Khách mua nhiều nhất trong kỳ (theo tổng tiền hóa đơn). */
export interface TopBuyer {
  id: number;
  code: string;
  name: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface TopProduct {
  productId: number;
  code: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface LowStockProduct {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  branchId: number;
  branchName: string;
  onHand: number;
  minQuality: number;
  maxQuality: number;
  basePrice: number;
  unit: string;
}

export interface RecentOrder {
  id: number;
  code: string;
  customerName: string;
  orderDate: string;
  grandTotal: number;
  orderStatus: string;
  paymentStatus: string;
}

export interface RecentActivity {
  id: number;
  code: string;
  customerName: string;
  grandTotal: number;
  createdAt: string;
}

export const dashboardApi = {
  getStats: (
    range: RangeKey = "month",
    branchId?: number,
    custom?: CustomDates,
  ): Promise<DashboardStats> => {
    return apiClient.get("/dashboard/stats", {
      range,
      branchId,
      ...customParams(range, custom),
    });
  },

  getTodayStats: (): Promise<TodayStats> => {
    return apiClient.get("/dashboard/today-stats");
  },

  getRevenueChart: (months = 6): Promise<RevenueChartItem[]> => {
    return apiClient.get("/dashboard/revenue-chart", { months });
  },

  getRevenueTrend: (
    range: RangeKey = "today",
    branchId?: number,
    custom?: CustomDates,
  ): Promise<TrendPoint[]> => {
    return apiClient.get("/dashboard/revenue-trend", {
      range,
      branchId,
      ...customParams(range, custom),
    });
  },

  getCategoryBreakdown: (
    range: RangeKey = "month",
    branchId?: number,
    dimension: CategoryDimension = "parent",
    custom?: CustomDates,
  ): Promise<CategorySlice[]> => {
    return apiClient.get("/dashboard/category-breakdown", {
      range,
      branchId,
      dimension,
      ...customParams(range, custom),
    });
  },

  getCategoryOptions: (
    dimension: CategoryDimension = "parent",
  ): Promise<string[]> => {
    return apiClient.get("/dashboard/category-options", { dimension });
  },

  getBranchComparison: (
    period: PeriodKey = "d7",
    metric: "rev" | "profit" = "rev",
    custom?: CustomDates,
  ): Promise<BranchComparison> => {
    return apiClient.get("/dashboard/branch-comparison", {
      period,
      metric,
      ...customParams(period, custom),
    });
  },

  getFinance: (
    period: PeriodKey = "all",
    branchId?: number,
    custom?: CustomDates,
  ): Promise<FinanceData> => {
    return apiClient.get("/dashboard/finance", {
      period,
      branchId,
      ...customParams(period, custom),
    });
  },

  getTasks: (
    type: "orders" | "debt" | "cod" | "stock" = "orders",
    branchId?: number,
    limit = 20,
    status?: string,
  ): Promise<TaskRow[]> => {
    return apiClient.get("/dashboard/tasks", { type, branchId, limit, status });
  },

  getTaskCounts: (
    branchId?: number,
  ): Promise<{ orders: number; debt: number; cod: number; stock: number }> => {
    return apiClient.get("/dashboard/task-counts", { branchId });
  },

  getTopCustomers: (limit = 10): Promise<TopCustomer[]> => {
    return apiClient.get("/dashboard/top-customers", { limit });
  },

  getTopProducts: (params?: {
    limit?: number;
    range?: RangeKey;
    branchId?: number;
    metric?: TopMetric;
    dimension?: CategoryDimension;
    categoryValue?: string;
    custom?: CustomDates;
  }): Promise<TopProduct[]> => {
    return apiClient.get("/dashboard/top-products", {
      ...customParams(params?.range ?? "month", params?.custom),
      limit: params?.limit ?? 10,
      range: params?.range ?? "month",
      branchId: params?.branchId,
      metric: params?.metric ?? "rev",
      dimension: params?.dimension,
      categoryValue: params?.categoryValue,
    });
  },

  getTopBuyers: (params?: {
    limit?: number;
    range?: RangeKey;
    branchId?: number;
    custom?: CustomDates;
  }): Promise<TopBuyer[]> => {
    const range = params?.range ?? "month";
    return apiClient.get("/dashboard/top-buyers", {
      limit: params?.limit ?? 10,
      range,
      branchId: params?.branchId,
      ...customParams(range, params?.custom),
    });
  },

  getLowStock: (limit = 10): Promise<LowStockProduct[]> => {
    return apiClient.get("/dashboard/low-stock", { limit });
  },

  getRecentOrders: (limit = 10): Promise<RecentOrder[]> => {
    return apiClient.get("/dashboard/recent-orders", { limit });
  },

  getRecentActivities: (limit = 15): Promise<RecentActivity[]> => {
    return apiClient.get("/dashboard/recent-activities", { limit });
  },
};
