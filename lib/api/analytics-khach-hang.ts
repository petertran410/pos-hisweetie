import { apiClient } from "@/lib/config/api";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
  CardValue,
  MetricRow,
  MetricValues,
} from "@/lib/api/analytics-reports";

// Báo cáo Phân tích › Khách Hàng (thay report Power BI "Báo Cáo Khách Hàng").
// Backend: /reports/analytics/khach-hang/*

/** Bộ lọc chung (slicer Power BI), mỗi bộ lọc chọn 1 giá trị. */
export interface KhFilters {
  year: number;
  months?: number[];
  customerType?: string;
  customerGroupId?: number;
  customerName?: string;
  region?: string;
  productGroup?: string;
  productType?: string;
  brand?: string;
  productPhase?: string;
  productCode?: string;
}

export interface KhPeriod {
  from: string;
  to: string;
  months: number[];
  year: number;
}

export interface KhFilterOptions {
  years: number[];
  customerTypes: string[];
  customerGroups: { id: number; name: string }[];
  customerNames: string[];
  regions: string[];
  productGroups: string[];
  productTypes: string[];
  brands: string[];
  productPhases: string[];
  products: { code: string; name: string }[];
}

// ── Tất Cả ──────────────────────────────────────────────────────────────────
export type KhMonthRow = MetricRow & { m: number };

export interface KhOverview {
  period: KhPeriod | null;
  compareLabel: string | null;
  compareRange?: { from: string; to: string };
  productFilter: boolean;
  axis: AnalyticsAxis;
  updatedAt: string;
  cards: {
    revenue: CardValue;
    newCustomers: CardValue;
    revenueNew: CardValue;
    keyPerSale: CardValue;
    vip: CardValue;
    activeCustomers: CardValue;
    aov: CardValue;
    arpc: CardValue;
  } | null;
  charts: {
    trend: {
      key: string;
      label: string;
      current: MetricRow;
      previous: MetricRow;
    }[];
    byMonthProductType: KhMonthRow[];
    byMonthCustomerType: KhMonthRow[];
    byRegion: MetricRow[];
    byCategory: MetricRow[];
    byProvince: MetricRow[];
    topParents: Record<AnalyticsMetric, { name: string; value: number }[]>;
  } | null;
}

// ── VIP / Key Persale ───────────────────────────────────────────────────────
export interface KhWeekCell {
  /** Giá trị theo chỉ số đang chọn (null = trống, tô hồng như Power BI). */
  v: number | null;
  /** Revenue WoW % (null = tuần trước không có doanh số). */
  w: number | null;
}
export type KhWeekCells = Record<string, KhWeekCell>;

export interface KhWeekly {
  period: KhPeriod | null;
  productFilter: boolean;
  metric: AnalyticsMetric;
  updatedAt: string;
  weekOptions: { wk: number; label: string }[];
  weeks: { wk: number; label: string }[];
  currentWeek: { wk: number; label: string } | null;
  increase: { name: string; value: number }[];
  decrease: { name: string; value: number }[];
  pivot: {
    total: KhWeekCells;
    parents: {
      name: string;
      cells: KhWeekCells;
      products: { code: string; name: string; cells: KhWeekCells }[];
    }[];
  } | null;
}

export type KhWeeklyFilters = KhFilters & {
  week?: number;
  metric?: AnalyticsMetric;
};

// ── Repeat Customer ─────────────────────────────────────────────────────────
export interface KhHeatmap {
  columns: (string | null)[];
  rows: {
    key: string | null;
    total: number | null;
    cells: Record<string, number | null>;
  }[];
  totals: Record<string, number | null>;
  grand: number | null;
}

export interface KhRepeatAction {
  parentName: string;
  saleRep: string;
  productCode: string;
  productName: string;
  qtyPrev: number;
  revPrev: number;
  rev3m: number;
  lastDate: string | null;
}

export interface KhRepeat {
  month: {
    year: number;
    month: number;
    from: string;
    to: string;
    prevFrom: string;
    prevTo: string;
  } | null;
  needMonth: boolean;
  productFilter: boolean;
  updatedAt: string;
  cards?: {
    retention: number | null;
    retentionDeltaPp: number | null;
    repeat: number;
    previousCustomers: number;
    repeatMoM: number | null;
    repeatShare: number | null;
    reacquired: number;
    care: number;
    careRevenue: number;
  };
  byCustomerType?: { key: string | null; rate: number | null }[];
  byTeam?: KhHeatmap;
  byRegion?: KhHeatmap;
  actions?: KhRepeatAction[];
}

// ── New Customer ────────────────────────────────────────────────────────────
export interface KhNewCustomers {
  period: KhPeriod | null;
  compareLabel?: string;
  compareRange?: { from: string; to: string };
  updatedAt: string;
  cards: { newCustomers: CardValue; revenueNew: CardValue } | null;
  byMonth: {
    m: number;
    newCustomers: number;
    revenueNew: number;
    activeCustomers: number;
  }[];
  list: {
    parentName: string | null;
    firstDate: string | null;
    customerType: string | null;
    region: string | null;
    orders: number;
    amount: number;
  }[];
}

// ── Churn Customer ──────────────────────────────────────────────────────────
export interface KhChurn {
  period: KhPeriod | null;
  today: string;
  productFilter: boolean;
  updatedAt: string;
  bySalePic: { key: string | null; value: number }[];
  totalCustomers: number;
  rows: {
    name: string;
    lastOrder: string;
    churnDay: number;
    value: MetricValues;
    products: { code: string; name: string; value: MetricValues }[];
  }[];
}

// ── Demand ──────────────────────────────────────────────────────────────────
export interface KhDemandCell {
  demand: number;
  actual: number;
  diff: number;
}
export interface KhDemandFilters {
  year: number;
  months?: number[];
  unit?: "base" | "bulk";
  customerCode?: string;
}
export interface KhDemand {
  year: number;
  months: number[];
  unit: "base" | "bulk";
  subtitle: string;
  updatedAt: string;
  customers: { code: string; name: string }[];
  rows: {
    code: string;
    name: string;
    cells: Record<string, KhDemandCell | null>;
    total: KhDemandCell;
  }[];
  total: { cells: Record<string, KhDemandCell | null>; total: KhDemandCell };
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export type KhListKey =
  "key_persale" | "vip_layer2" | "demand_maycha" | "internal_customers";
export interface KhCustomerListRow {
  id: number;
  customerCode: string;
  customerName: string | null;
  inPos: boolean;
  note: string | null;
}
export interface KhSalePic {
  id: number;
  groupName: string;
  teamName: string | null;
  sortOrder: number;
}
export interface KhSaleRepRule {
  id: number;
  salePic: string;
  customerType: string | null;
  region: string | null;
  saleRep: string;
  priority: number;
}

const BASE = "/reports/analytics/khach-hang";
const CFG = `${BASE}/config`;

export const analyticsKhachHangApi = {
  getFilterOptions: (): Promise<KhFilterOptions> =>
    apiClient.get(`${BASE}/bo-loc`),
  getOverview: (p: KhFilters & { axis?: AnalyticsAxis }): Promise<KhOverview> =>
    apiClient.get(`${BASE}/tong-quan`, p),
  getNewCustomers: (p: KhFilters): Promise<KhNewCustomers> =>
    apiClient.get(`${BASE}/khach-moi`, p),
  getChurn: (p: KhFilters): Promise<KhChurn> =>
    apiClient.get(`${BASE}/khach-roi-bo`, p),
  getDemand: (p: KhDemandFilters): Promise<KhDemand> =>
    apiClient.get(`${BASE}/demand`, p),

  // Cấu hình
  listCustomerList: (listKey: KhListKey): Promise<KhCustomerListRow[]> =>
    apiClient.get(`${CFG}/customer-lists`, { listKey }),
  addCustomerList: (data: {
    listKey: KhListKey;
    customerCode: string;
    note?: string;
  }) => apiClient.post(`${CFG}/customer-lists`, data),
  deleteCustomerList: (id: number) =>
    apiClient.delete(`${CFG}/customer-lists/${id}`),
  listSalePics: (): Promise<KhSalePic[]> => apiClient.get(`${CFG}/sale-pics`),
  createSalePic: (data: Omit<KhSalePic, "id">) =>
    apiClient.post(`${CFG}/sale-pics`, data),
  updateSalePic: (id: number, data: Partial<Omit<KhSalePic, "id">>) =>
    apiClient.patch(`${CFG}/sale-pics/${id}`, data),
  deleteSalePic: (id: number) => apiClient.delete(`${CFG}/sale-pics/${id}`),
  listSaleRepRules: (): Promise<KhSaleRepRule[]> =>
    apiClient.get(`${CFG}/sale-rep-rules`),
  createSaleRepRule: (data: Omit<KhSaleRepRule, "id">) =>
    apiClient.post(`${CFG}/sale-rep-rules`, data),
  updateSaleRepRule: (id: number, data: Partial<Omit<KhSaleRepRule, "id">>) =>
    apiClient.patch(`${CFG}/sale-rep-rules/${id}`, data),
  deleteSaleRepRule: (id: number) =>
    apiClient.delete(`${CFG}/sale-rep-rules/${id}`),

  getRepeat: (p: KhFilters): Promise<KhRepeat> =>
    apiClient.get(`${BASE}/khach-quay-lai`, p),
  getWeekly: (kind: "vip" | "key", p: KhWeeklyFilters): Promise<KhWeekly> =>
    apiClient.get(`${BASE}/${kind === "vip" ? "vip" : "key-persale"}`, p),
};
