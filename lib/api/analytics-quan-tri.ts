import { apiClient } from "@/lib/config/api";
import type { AnalyticsAxis } from "@/lib/api/analytics-reports";

// Báo cáo Phân tích › Quản Trị (thay report Power BI "Báo Cáo Quản Trị").
// Backend: /reports/analytics/quan-tri/*

/** view_by[mode] của Quản Trị (thêm Lợi Nhuận / % Lợi Nhuận). */
export type QtMetric =
  "amount" | "orders" | "quantity" | "customers" | "profit" | "margin";

/** Bookmark của trang Lợi Nhuận. */
export type QtProfitView = "team" | "customer" | "product" | "customerDetail";

export interface QtFilters {
  year: number;
  months?: number[];
  axis?: AnalyticsAxis;
  metric?: QtMetric;
  /** id team; 0 = "6.Khác" (nhân viên ngoài team). */
  saleTeamId?: number;
  customerType?: string;
  parentName?: string;
  groupSource?: string;
  productGroup?: string;
  productType?: string;
  category?: string;
  origin?: string;
  brand?: string;
  productCode?: string;
}

export interface QtPeriod {
  from: string;
  to: string;
  months: number[];
  year: number;
}

export interface QtMetricValues {
  amount: number;
  orders: number;
  customers: number;
  quantity: number;
  profit: number;
  margin: number | null;
}

export interface QtRow extends QtMetricValues {
  key: string | null;
}

export interface QtCard {
  current: number | null;
  previous: number | null;
  growth: number | null;
}

export interface QtGrowthCards {
  revenue: QtCard;
  quantity: QtCard;
  aov: QtCard;
  arpc: QtCard;
  /** gross_profit, % = growth_netProfit_samePeriod */
  grossProfit: QtCard;
  /** switch_margin (product_margin), % = growth_margin_samePeriod (_margin) */
  margin: QtCard;
}

export interface QtOverview {
  period: QtPeriod | null;
  compareLabel: string | null;
  compareRange: { from: string; to: string } | null;
  axis: AnalyticsAxis;
  metric?: QtMetric;
  updatedAt: string;
  cards: QtGrowthCards | null;
  charts: {
    byYear: QtRow[];
    byPeriod: {
      key: string;
      label: string;
      current: QtRow;
      previous: QtRow;
    }[];
    byVipWholesale: QtRow[];
    byCustomerType: QtRow[];
    byProductType: QtRow[];
    byBrand: QtRow[];
    byCategory: QtRow[];
  } | null;
}

// ── Lợi Nhuận ──────────────────────────────────────────────────────────────
export interface QtPlColumn {
  team: string | null;
  grossRevenue: number;
  discount: number;
  discountRate: number | null;
  returns: number;
  netRevenue: number;
  cost: number;
  grossProfit: number;
  margin: number | null;
}

export interface QtParentProfit {
  name: string;
  isVip: boolean;
  amount: number;
  netProfit: number;
  margin: number | null;
}

export interface QtDetailValues {
  amount: number;
  cost: number;
  profit: number;
  margin: number | null;
  quantity: number;
  discount: number;
}

export interface QtProductRow extends QtDetailValues {
  code: string | null;
  name: string | null;
  productType: string | null;
  origin: string | null;
  category: string | null;
  productGroup: string | null;
  byCustomerType: Record<string, { amount: number; profit: number }>;
}

export interface QtCustomerDetailRow extends QtDetailValues {
  customerType: string | null;
  parentName: string | null;
  allProductsProfit: number;
}

interface QtProfitBase {
  period: QtPeriod | null;
  updatedAt: string;
}

export interface QtProfitTeam extends QtProfitBase {
  view: "team";
  teams?: QtPlColumn[];
  total?: QtPlColumn;
}

export interface QtProfitCustomer extends QtProfitBase {
  view: "customer";
  byVip?: { key: string; netProfit: number }[];
  topProfit?: QtParentProfit[];
  thinMargin?: QtParentProfit[];
  categoryMix?: { parent: string; name: string | null; quantity: number }[];
  productMix?: { parent: string; name: string | null; quantity: number }[];
}

export interface QtProfitProduct extends QtProfitBase {
  view: "product";
  allProductsProfit?: number;
  total?: QtDetailValues;
  products?: QtProductRow[];
}

export interface QtProfitCustomerDetail extends QtProfitBase {
  view: "customerDetail";
  rows?: QtCustomerDetailRow[];
}

export type QtProfit =
  QtProfitTeam | QtProfitCustomer | QtProfitProduct | QtProfitCustomerDetail;

// ── Khách Hàng ─────────────────────────────────────────────────────────────
export interface QtCustomerTypeValues {
  aov: number | null;
  aoc: number | null;
  arpc: number | null;
  newCustomers: number;
  quantity: number;
  orders: number;
  revenue: number;
  cost: number;
  margin: number | null;
}

/** Ô bảng tháng: k = "cur:YYYY-MM" (tháng đang xem) | "prev:YYYY-MM" (tháng liền trước của nó). */
export interface QtPivotCell {
  k: string | null;
  value: number | null;
}

export interface QtCustomers {
  period: QtPeriod | null;
  metric: QtMetric;
  updatedAt: string;
  cards?: {
    activeCustomers: number;
    newCustomers: number;
    newCustomerRevenue: number;
    aov: number | null;
    arpc: number | null;
  };
  byMonthType?: { month: number; key: string | null; value: number }[];
  byMonthStatus?: { month: number; key: string | null; value: number }[];
  byType?: (QtCustomerTypeValues & { key: string })[];
  byTypeTotal?: QtCustomerTypeValues;
  byTypeRegion?: {
    customerType: string | null;
    region: string | null;
    value: number | null;
  }[];
  byRegion?: { key: string | null; value: number | null }[];
  byProvince?: { key: string | null; value: number }[];
  pivot?: {
    months: string[];
    cells: (QtPivotCell & {
      customerType: string | null;
      code: string | null;
      name: string | null;
    })[];
    typeMonths: (QtPivotCell & { customerType: string | null })[];
    monthTotals: QtPivotCell[];
  };
}

// ── Sản Phẩm ───────────────────────────────────────────────────────────────
export interface QtProducts {
  period: QtPeriod | null;
  compareLabel?: string;
  compareRange?: { from: string; to: string };
  metric: QtMetric;
  axis: AnalyticsAxis;
  updatedAt: string;
  cards?: QtGrowthCards & {
    metricValue: number | null;
    netMargin: number | null;
    target: { revenue: number; plan: number | null; rate: number | null };
  };
  trend?: (QtMetricValues & { key: string; label: string })[];
  products?: (QtMetricValues & { code: string | null; name: string | null })[];
  pivot?: {
    months: string[];
    cells: (QtPivotCell & {
      category: string | null;
      code: string | null;
      name: string | null;
    })[];
    categoryMonths: (QtPivotCell & { category: string | null })[];
    monthTotals: (QtPivotCell & { all: number | null })[];
    rowTotals: {
      category: string | null;
      code: string | null;
      value: number | null;
    }[];
    categoryTotals: { category: string | null; value: number | null }[];
    grandTotal: { value: number | null; all: number | null };
  };
}

export interface QtFilterOptions {
  years: number[];
  saleTeams: { id: number; name: string }[];
  customerTypes: string[];
  groupSources: string[];
  vipWholesaleParents: string[];
  vipParents: string[];
  parents: string[];
  productTypes: string[];
  productGroups: string[];
  categories: string[];
  origins: string[];
  brands: string[];
  products: {
    code: string;
    name: string;
    category: string | null;
    brand: string | null;
  }[];
}

// ── Cấu hình ───────────────────────────────────────────────────────────────
export type QtExclusionKind = "customer" | "seller";

export interface QtExclusion {
  id: number;
  kind: QtExclusionKind;
  code: string;
  note: string | null;
  isActive: boolean;
  /** Tên khách / nhân viên (tra theo mã). */
  label: string | null;
}

const BASE = "/reports/analytics/quan-tri";

export const analyticsQuanTriApi = {
  getFilterOptions: (): Promise<QtFilterOptions> =>
    apiClient.get(`${BASE}/filter-options`),
  getOverview: (p: QtFilters): Promise<QtOverview> =>
    apiClient.get(`${BASE}/tong-quan`, p),
  getProfit: (p: QtFilters & { view: QtProfitView }): Promise<QtProfit> =>
    apiClient.get(`${BASE}/loi-nhuan`, p),
  getCustomers: (p: QtFilters): Promise<QtCustomers> =>
    apiClient.get(`${BASE}/khach-hang`, p),
  getProducts: (p: QtFilters): Promise<QtProducts> =>
    apiClient.get(`${BASE}/san-pham`, p),

  listExclusions: (): Promise<QtExclusion[]> =>
    apiClient.get(`${BASE}/config/exclusions`),
  createExclusion: (data: {
    kind: QtExclusionKind;
    code: string;
    note?: string;
  }) => apiClient.post(`${BASE}/config/exclusions`, data),
  updateExclusion: (id: number, data: { note?: string; isActive?: boolean }) =>
    apiClient.patch(`${BASE}/config/exclusions/${id}`, data),
  deleteExclusion: (id: number) =>
    apiClient.delete(`${BASE}/config/exclusions/${id}`),
};
