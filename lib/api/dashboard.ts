import { apiClient } from "@/lib/config/api";

export type RangeKey = "today" | "week" | "month";
export type FinRangeKey = "d7" | "m30" | "all";
export type TopMetric = "rev" | "qty" | "profit";
export type CategoryDimension = "parent" | "middle" | "child";

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
  finRange: FinRangeKey;
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
  getStats: (range: RangeKey = "month", branchId?: number): Promise<DashboardStats> => {
    return apiClient.get("/dashboard/stats", { range, branchId });
  },

  getTodayStats: (): Promise<TodayStats> => {
    return apiClient.get("/dashboard/today-stats");
  },

  getRevenueChart: (months = 6): Promise<RevenueChartItem[]> => {
    return apiClient.get("/dashboard/revenue-chart", { months });
  },

  getRevenueTrend: (range: RangeKey = "today", branchId?: number): Promise<TrendPoint[]> => {
    return apiClient.get("/dashboard/revenue-trend", { range, branchId });
  },

  getCategoryBreakdown: (
    range: RangeKey = "month",
    branchId?: number,
    dimension: CategoryDimension = "parent"
  ): Promise<CategorySlice[]> => {
    return apiClient.get("/dashboard/category-breakdown", {
      range,
      branchId,
      dimension,
    });
  },

  getCategoryOptions: (dimension: CategoryDimension = "parent"): Promise<string[]> => {
    return apiClient.get("/dashboard/category-options", { dimension });
  },

  getBranchComparison: (
    range: RangeKey = "week",
    metric: "rev" | "profit" = "rev"
  ): Promise<BranchComparison> => {
    return apiClient.get("/dashboard/branch-comparison", { range, metric });
  },

  getFinance: (finRange: FinRangeKey = "all", branchId?: number): Promise<FinanceData> => {
    return apiClient.get("/dashboard/finance", { finRange, branchId });
  },

  getTasks: (
    type: "orders" | "debt" | "cod" | "stock" = "orders",
    branchId?: number,
    limit = 20,
    status?: string
  ): Promise<TaskRow[]> => {
    return apiClient.get("/dashboard/tasks", { type, branchId, limit, status });
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
  }): Promise<TopProduct[]> => {
    return apiClient.get("/dashboard/top-products", {
      limit: params?.limit ?? 10,
      range: params?.range ?? "month",
      branchId: params?.branchId,
      metric: params?.metric ?? "rev",
      dimension: params?.dimension,
      categoryValue: params?.categoryValue,
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
