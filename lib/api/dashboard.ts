import { apiClient } from "@/lib/config/api";

export interface DashboardStats {
  currentRevenue: number;
  lastRevenue: number;
  revenueChange: number;
  currentMonthOrders: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  lowStockProducts: number;
  outOfStockProducts: number;
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
  getStats: (): Promise<DashboardStats> => {
    return apiClient.get("/dashboard/stats");
  },

  getTodayStats: (): Promise<TodayStats> => {
    return apiClient.get("/dashboard/today-stats");
  },

  getRevenueChart: (months = 6): Promise<RevenueChartItem[]> => {
    return apiClient.get("/dashboard/revenue-chart", { months });
  },

  getTopCustomers: (limit = 10): Promise<TopCustomer[]> => {
    return apiClient.get("/dashboard/top-customers", { limit });
  },

  getTopProducts: (limit = 10): Promise<TopProduct[]> => {
    return apiClient.get("/dashboard/top-products", { limit });
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
