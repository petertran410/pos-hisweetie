import { apiClient } from "@/lib/config/api";
import type {
  AnalyticsBusinessFilters,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";

// Phân tích › Kinh Doanh — các trang BC Định Kì, Khách Hàng, Sản Phẩm, Đối Thủ.
// Backend: /reports/analytics/kinh-doanh/*

const BASE = "/reports/analytics/kinh-doanh";

export type KdScope =
  | "all"
  | "keyLermao"
  | "lermaoKey"
  | "mutLermaoKey"
  | "boduoKey"
  | "phKey"
  | "vip"
  | "lermaoPh"
  | "toppingLermao";

export interface KdFilters extends AnalyticsBusinessFilters {
  metric?: AnalyticsMetric;
  scope?: KdScope;
  customerType?: string;
  productType?: string;
  brand?: string;
  category?: string;
  productCode?: string;
  specialGroup?: string;
}

export interface KdOptions {
  productTypes: string[];
  brands: string[];
  categories: string[];
  products: { code: string; name: string }[];
  parents: string[];
  customerTypes: string[];
  specialGroups: string[];
  demandCustomers: { code: string; name: string }[];
}

export interface DateRange {
  from: string;
  to: string;
}

// ── BC Định Kì ──────────────────────────────────────────────────────────────
export interface WeekCompareRow {
  key: string | null;
  thisWeek: number;
  lastWeek: number;
  plan?: number | null;
  rateThisWeek?: number | null;
  rateLastWeek?: number | null;
}

export interface PeriodicDetail {
  today: string;
  ranges: {
    thisWeek: DateRange;
    lastWeek: DateRange;
    thisMonth: DateRange;
    lastMonth: DateRange;
  };
  updatedAt: string;
  debt: {
    value: number;
    revenue: number;
    plan: number | null;
    rate: number | null;
  };
  o1: WeekCompareRow[];
  o2: WeekCompareRow[];
  staff: WeekCompareRow[];
  central: WeekCompareRow[];
  totals: { thisWeek: number; lastWeek: number };
  weekly: {
    columns: { key: string; label: string }[];
    rows: { group: string; values: Record<string, number> }[];
    total: Record<string, number>;
  };
}

export type DashboardView = "week" | "lastWeek" | "month";

export interface PeriodicDashboard {
  view: DashboardView;
  today: string;
  current: DateRange;
  previous: DateRange;
  updatedAt: string;
  finance: {
    revenue: { current: number; previous: number; growth: number | null };
    orders: { current: number; previous: number; growth: number | null };
    kpi: { actual: number; target: number | null; rate: number | null };
    central: { current: number; previous: number };
  };
  groups: {
    key: string;
    actual: number;
    previous: number;
    plan: number | null;
    rate: number | null;
    growth: number | null;
  }[];
  visual: {
    key: string;
    actual: number;
    previous: number;
    share: number | null;
    growth: number | null;
  }[];
  debt: { total: number; over30: number };
  customers: {
    newCurrent: number;
    newPrevious: number;
    newAmountCurrent: number;
    newAmountPrevious: number;
  };
  teams: {
    team: string;
    revenue: number;
    orders: number;
    newCustomers: number;
    target: number | null;
    rate: number | null;
  }[];
  topLermao: { name: string; quantity: number; amount: number }[];
  topPhuongHoang: { name: string; quantity: number; amount: number }[];
}

export interface PeriodicRegion {
  today: string;
  month: DateRange;
  updatedAt: string;
  totalCurrent: number;
  regions: {
    region: string;
    current: number;
    previous: number;
    share: number | null;
    growth: number | null;
    activeCustomers: number;
    newCustomers: number;
    orders: number;
    aov: number | null;
    customerTypes: { le: number; buon: number; chuoi: number };
    topBrand: { name: string; amount: number; quantity: number }[];
    topTrade: { name: string; amount: number; quantity: number }[];
  }[];
}

// ── Pivot chung (matrix) ────────────────────────────────────────────────────
export type PivotDim =
  | "region"
  | "province"
  | "parent_name"
  | "customer_name"
  | "customer_type"
  | "sale_admin_pic"
  | "team"
  | "seller"
  | "product_name"
  | "product_type"
  | "brand"
  | "category"
  | "group2026"
  | "visual_group";

export interface PivotParams {
  rows: PivotDim[];
  path?: string[];
  cols?: "month" | "week" | "none";
  growth?: "mom" | "wow" | "none";
  detail?: boolean;
}

/** v[k] = [doanh số, số đơn, sản lượng, số khách]; g[k] = tăng trưởng. */
export interface PivotCells {
  v: Record<string, [number, number, number, number]>;
  g: Record<string, number | null>;
}

export interface PivotResult {
  dim: string;
  metric: AnalyticsMetric;
  columns: { key: string; label: string }[];
  rows: (PivotCells & { key: string | null })[];
  total: PivotCells | null;
}

// ── Khách Hàng ──────────────────────────────────────────────────────────────
export type CustomerSection =
  | "overview"
  | "region"
  | "detail"
  | "repeat"
  | "churn"
  | "demand"
  | "lermao"
  | "mutLermao"
  | "boduo"
  | "phuongHoang";

export interface GrowthCard {
  current: number | null;
  previous: number | null;
  growth: number | null;
}
export interface KeyValue {
  key: string | null;
  value: number;
}
export interface LineListing {
  truncated: boolean;
  rows: {
    date: string;
    invoiceCode: string;
    customerCode: string | null;
    customerName: string | null;
    parentName: string | null;
    productCode: string | null;
    productName: string | null;
    quantity: number;
    price: number;
    discount: number;
    amount: number;
    discount100: boolean;
  }[];
}

export interface CustomerSectionData {
  section: CustomerSection;
  updatedAt: string;
  period: { from: string; to: string } | null;
  metric?: AnalyticsMetric;
  // overview
  compareLabel?: string;
  compareRange?: DateRange;
  cards?: Record<
    | "revenue"
    | "newCustomers"
    | "keyPerSale"
    | "activeCustomers"
    | "vip"
    | "arpc"
    | "aov"
    | "newRevenue",
    GrowthCard
  >;
  trend?: {
    key: string;
    label: string;
    current?: number;
    previous?: number;
    value?: number;
  }[];
  waterfall?: {
    month: number;
    value: number;
    previous: number;
    growth: number | null;
  }[];
  byCustomerTypeMonth?: { month: number; key: string | null; value: number }[];
  byProductTypeMonth?: { month: number; key: string | null; value: number }[];
  topCustomers?: KeyValue[];
  byRegion?: KeyValue[];
  byCategory?: KeyValue[];
  byProvince?: KeyValue[];
  byCustomerType?: {
    key: string | null;
    quantity: number;
    orders: number;
    revenue: number;
    aov: number | null;
    aoc: number | null;
    arpc: number | null;
    newCustomers: number;
  }[];
  // region
  axisKeys?: { key: string; label: string }[];
  table?: {
    key: string | null;
    revenue: number;
    activeCustomers: number;
    aov: number | null;
    newCustomers: number;
  }[];
  // detail (WoW)
  week?: (DateRange & { label: string; previous: DateRange }) | null;
  increase?: {
    key: string | null;
    current: number;
    previous: number;
    growth: number | null;
  }[];
  decrease?: {
    key: string | null;
    current: number;
    previous: number;
    growth: number | null;
  }[];
  // repeat
  months?: (string | number)[];
  byGroup?: { key: string; rate: number | null }[];
  byGroupRegion?: {
    group: string | null;
    region: string | null;
    rate: number | null;
  }[];
  picByTeamRegion?: {
    team: string | null;
    region: string | null;
    value: number;
  }[];
  pivot?: RepeatPivotRow[];
  customers?: {
    code: string;
    name: string;
    parentName: string | null;
    group: string;
    province: string | null;
    lastOrder: string | null;
    ytd: number | null;
    lastMonth: number | null;
    currentMonth: number | null;
    mom: number | null;
  }[];
  customerCount?: number;
  // demand
  unit?: "base" | "bulk";
  rows?: {
    code: string;
    name: string;
    demand: Record<string, number>;
    actual: Record<string, number>;
  }[];
  // lermao / boduo / phuong hoang
  scope?: KdScope;
  dlcl?: {
    columns: string[];
    rows: {
      category: string;
      values: Record<string, number>;
      products: { name: string; values: Record<string, number> }[];
    }[];
    total: Record<string, number>;
  } | null;
  lines?: LineListing;
  byMonth?: KeyValue[];
  topProducts?: KeyValue[];
}

export interface RepeatCell {
  revenue: number;
  orders: number;
  active: number;
  newCustomers: number;
  picTotal: number;
  rate: number | null;
}
export interface RepeatPivotRow {
  key: string | null;
  cells: Record<string, RepeatCell>;
  total: RepeatCell;
  children?: {
    key: string | null;
    cells: Record<string, RepeatCell>;
    total: RepeatCell;
  }[];
}

export interface ChurnData {
  period: DateRange | null;
  today: string;
  group: string;
  metric: AnalyticsMetric;
  customerCount: number;
  customers: {
    code: string | null;
    name: string | null;
    lastOrder: string | null;
    churnDays: number | null;
    value: number;
    products: { name: string | null; value: number }[];
  }[];
  bySalePic: { key: string; value: number }[];
}

// ── Sản Phẩm ────────────────────────────────────────────────────────────────
export interface ProductPageData {
  period: (DateRange & { months: number[] }) | null;
  updatedAt: string;
  metric: AnalyticsMetric;
  lermaoPhTotal: number;
  byBrand: SeriesSet;
  byCategory: SeriesSet;
  waterfall: {
    month: number;
    value: number;
    previous: number;
    growth: number | null;
  }[];
}
export interface SeriesSet {
  keys: (string | null)[];
  points: { key: string | null; month: number; value: number }[];
}
export interface InventoryData {
  branches: string[];
  rows: { product: string; values: Record<string, number[]> }[];
}

// ── Đối Thủ ─────────────────────────────────────────────────────────────────
export interface PlanCell {
  actual: number;
  plan: number | null;
  rate: number | null;
}
export interface NewCustomerCell {
  revenue: number;
  orders: number;
  customers: number;
}
export interface CompetitorData {
  period: (DateRange & { months: number[] }) | null;
  updatedAt: string;
  debt: {
    value: number;
    revenue: number;
    plan: number | null;
    rate: number | null;
  };
  brandCompare: {
    lermao: BrandSide;
    boduo: BrandSide;
    topLermao: { name: string | null; amount: number; quantity: number }[];
    topBoduo: { name: string | null; amount: number; quantity: number }[];
    flavors: { flavor: string; lermao: number; boduo: number }[];
  };
  teams: string[];
  staffMonth: { key: string; label: string; cells: Record<string, PlanCell> }[];
  staffWeek: { key: string; label: string; cells: Record<string, PlanCell> }[];
  weeks: { key: string; label: string }[];
  groupWeek: { key: string | null; cells: Record<string, PlanCell> }[];
  newTeams: string[];
  newCustomers: {
    key: string;
    cells: Record<string, NewCustomerCell>;
    weeks: {
      key: string;
      label: string;
      cells: Record<string, NewCustomerCell>;
    }[];
  }[];
  newCustomerList: {
    team: string | null;
    code: string | null;
    name: string | null;
    month: string | null;
    lastDate: string | null;
    orders: number;
    revenue: number;
  }[];
}
export interface BrandSide {
  revenue: number;
  quantity: number;
  orders: number;
  customers: number;
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export interface KdVisualTarget {
  id: number;
  visualProductGroup: string;
  year: number;
  month: number;
  kpiValue: number;
}
export interface KdCustomerKey {
  id: number;
  customerCode: string;
  customerName: string | null;
  isVip: boolean;
}
export interface KdDlclColumn {
  id: number;
  label: string;
  customerCodes: string[];
  sortOrder: number;
}
export interface KdJamFlavor {
  id: number;
  productCode: string;
  productName: string | null;
  brand: string;
  jamFlavor: string;
}

const CFG = `${BASE}/config`;

export const analyticsKdConfigApi = {
  listVisualTargets: (year?: number): Promise<KdVisualTarget[]> =>
    apiClient.get(`${CFG}/visual-targets`, { year }),
  upsertVisualTarget: (d: Omit<KdVisualTarget, "id">) =>
    apiClient.post(`${CFG}/visual-targets`, d),
  updateVisualTarget: (id: number, kpiValue: number) =>
    apiClient.patch(`${CFG}/visual-targets/${id}`, { kpiValue }),
  deleteVisualTarget: (id: number) =>
    apiClient.delete(`${CFG}/visual-targets/${id}`),
  listCustomerKeys: (): Promise<KdCustomerKey[]> =>
    apiClient.get(`${CFG}/customer-keys`),
  createCustomerKey: (d: { customerCode: string; isVip?: boolean }) =>
    apiClient.post(`${CFG}/customer-keys`, d),
  updateCustomerKey: (id: number, isVip: boolean) =>
    apiClient.patch(`${CFG}/customer-keys/${id}`, { isVip }),
  deleteCustomerKey: (id: number) =>
    apiClient.delete(`${CFG}/customer-keys/${id}`),
  listDlclColumns: (): Promise<KdDlclColumn[]> =>
    apiClient.get(`${CFG}/dlcl-columns`),
  createDlclColumn: (d: Omit<KdDlclColumn, "id">) =>
    apiClient.post(`${CFG}/dlcl-columns`, d),
  updateDlclColumn: (id: number, d: Partial<Omit<KdDlclColumn, "id">>) =>
    apiClient.patch(`${CFG}/dlcl-columns/${id}`, d),
  deleteDlclColumn: (id: number) =>
    apiClient.delete(`${CFG}/dlcl-columns/${id}`),
  listJamFlavors: (): Promise<KdJamFlavor[]> =>
    apiClient.get(`${CFG}/jam-flavors`),
  createJamFlavor: (d: {
    productCode: string;
    brand: string;
    jamFlavor: string;
  }) => apiClient.post(`${CFG}/jam-flavors`, d),
  updateJamFlavor: (id: number, d: { brand?: string; jamFlavor?: string }) =>
    apiClient.patch(`${CFG}/jam-flavors/${id}`, d),
  deleteJamFlavor: (id: number) => apiClient.delete(`${CFG}/jam-flavors/${id}`),
};

export const analyticsKdApi = {
  options: (): Promise<KdOptions> => apiClient.get(`${BASE}/options`),
  periodicDetail: (f: KdFilters): Promise<PeriodicDetail> =>
    apiClient.get(`${BASE}/bc-dinh-ki`, f),
  periodicDashboard: (
    f: KdFilters,
    view: DashboardView,
  ): Promise<PeriodicDashboard> =>
    apiClient.get(`${BASE}/bc-dinh-ki/dashboard`, { ...f, view }),
  periodicRegion: (f: KdFilters): Promise<PeriodicRegion> =>
    apiClient.get(`${BASE}/bc-dinh-ki/vung`, f),
  pivot: (f: KdFilters, p: PivotParams): Promise<PivotResult> =>
    apiClient.get(`${BASE}/pivot`, { ...f, ...p }),
  customer: (
    f: KdFilters,
    section: CustomerSection,
    extra?: { unit?: "base" | "bulk"; demandCustomer?: string },
  ): Promise<CustomerSectionData> =>
    apiClient.get(`${BASE}/khach-hang`, { ...f, ...extra, section }),
  churn: (f: KdFilters, churnGroup: string): Promise<ChurnData> =>
    apiClient.get(`${BASE}/khach-hang/churn`, { ...f, churnGroup }),
  product: (f: KdFilters): Promise<ProductPageData> =>
    apiClient.get(`${BASE}/san-pham`, f),
  inventory: (f: KdFilters): Promise<InventoryData> =>
    apiClient.get(`${BASE}/san-pham/ton-kho`, f),
  competitor: (f: KdFilters): Promise<CompetitorData> =>
    apiClient.get(`${BASE}/doi-thu`, f),
};
