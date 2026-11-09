import { apiClient } from "@/lib/config/api";

// Phân tích › KPI Sale (thay dataset + report "KPI Sale" của Power BI).
// Backend: /reports/analytics/kpi-sale/*  — số liệu đã áp phân quyền theo người xem.

const BASE = "/reports/analytics/kpi-sale";
const CFG = `${BASE}/config`;

export interface KpiSaleFilters {
  year: number;
  months?: number[];
  /** Mã nhân viên (phần trước @ email). */
  users?: string[];
}

export interface KpiSaleDailyFilters extends KpiSaleFilters {
  from?: string;
  to?: string;
  sellers?: number[];
  groups?: string[];
  invoiceCode?: string;
  page?: number;
  pageSize?: number;
}

export interface KpiSaleOrderFilters extends KpiSaleFilters {
  salePics?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface KpiUser {
  code: string;
  name: string;
}

export interface KpiWeek {
  year: number;
  week: number;
  from: string;
  to: string;
}

export interface KpiPeriod {
  year: number;
  months: number[];
  from: string;
  to: string;
}

export interface KpiSaleOptions {
  years: number[];
  restricted: boolean;
  viewerCode: string | null;
  users: KpiUser[];
  productGroups: string[];
  salePics: string[];
  week: KpiWeek;
}

export interface KpiIncomeRow {
  code: string;
  name: string;
  ym: string;
  kpi: number | null;
  revenue: number | null;
  kpiProduct: number | null;
  pct: number | null;
  remain: number | null;
}

export interface KpiProductMixCell {
  code: string;
  name: string;
  ym: string;
  group: string | null;
  kpi: number | null;
  revenue: number | null;
}

export interface KpiSaleIncome {
  period: KpiPeriod;
  restricted: boolean;
  week: KpiWeek;
  users: KpiUser[];
  cards: {
    kpi: number | null;
    revenue: number | null;
    weekRevenue: number | null;
    remain: number | null;
  };
  income: {
    rows: KpiIncomeRow[];
    totals: Omit<KpiIncomeRow, "code" | "name" | "ym">;
  };
  productMix: KpiProductMixCell[];
  updatedAt: string;
}

export interface KpiDailyRow {
  pic: string | null;
  seller: string | null;
  code: string;
  date: string;
  customerCode: string | null;
  customerName: string | null;
  customerType: string | null;
  productName: string | null;
  group: string | null;
  revenue: number | null;
  check: "Có" | "Không";
  productType: string | null;
}

export interface KpiPage<T> {
  page: number;
  pageSize: number;
  total: number;
  sum: number | null;
  rows: T[];
}

export interface KpiSaleDaily {
  period: KpiPeriod;
  restricted: boolean;
  byGroup: { group: string | null; revenue: number }[];
  byCheck: { key: "Có" | "Không"; revenue: number }[];
  expected: {
    code: string | null;
    name: string | null;
    group: string | null;
    revenue: number | null;
    income: number | null;
  }[];
  detail: KpiPage<KpiDailyRow>;
  sellers: { id: number; name: string }[];
  updatedAt: string;
}

export interface KpiSaleOrder {
  period: KpiPeriod;
  restricted: boolean;
  bySeller: {
    sellerId: number | null;
    seller: string | null;
    rep: string | null;
    revenue: number | null;
    invoices: number;
  }[];
  customers: KpiPage<{
    code: string | null;
    name: string | null;
    salePic: string | null;
    rep: string | null;
    revenue: number | null;
  }>;
  updatedAt: string;
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export interface KpiRevenueTarget {
  id: number;
  year: number;
  month: number;
  saleCode: string;
  kpiValue: number;
  basicSalary: number;
}

export interface KpiProductTarget {
  id: number;
  year: number;
  month: number;
  saleCode: string;
  productGroup: string;
  kpiValue: number;
}

export interface KpiRepRule {
  id: number;
  priority: number;
  salePic: string;
  customerType: string | null;
  region: string | null;
  saleCode: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  note: string | null;
}

export interface KpiIncomeRule {
  id: number;
  saleCode: string;
  customerTypes: string[];
  productTypes: string[];
  productGroups: string[];
  isActive: boolean;
  note: string | null;
}

export interface KpiProductMap {
  id: number;
  fromCode: string;
  toCode: string;
  fromName: string | null;
  toName: string | null;
  note: string | null;
}

export interface KpiConfigOptions {
  users: KpiUser[];
  customerGroups: string[];
  customerTypes: string[];
  productTypes: string[];
  productGroups: string[];
  regions: string[];
}

export interface KpiSaleLogic {
  period: KpiPeriod;
  restricted: boolean;
  exclude: { productCode: string; from: string };
  repRules: KpiRepRule[];
  incomeRules: KpiIncomeRule[];
  productMaps: KpiProductMap[];
  split: {
    code: string | null;
    name: string | null;
    customerType: string | null;
    productType: string | null;
    revenue: number | null;
    income: number | null;
  }[];
  updatedAt: string;
}

export type KpiConfigTable =
  | "revenue-targets"
  | "product-targets"
  | "rep-rules"
  | "income-rules"
  | "product-maps";

export const kpiSaleApi = {
  options: (): Promise<KpiSaleOptions> => apiClient.get(`${BASE}/options`),
  saleIncome: (p: KpiSaleFilters): Promise<KpiSaleIncome> =>
    apiClient.get(`${BASE}/sale-income`, p),
  daily: (p: KpiSaleDailyFilters): Promise<KpiSaleDaily> =>
    apiClient.get(`${BASE}/theo-ngay`, {
      ...p,
      invoiceCode: p.invoiceCode || undefined,
    }),
  orderOnBehalf: (p: KpiSaleOrderFilters): Promise<KpiSaleOrder> =>
    apiClient.get(`${BASE}/len-don-ho`, {
      ...p,
      search: p.search || undefined,
    }),
  logic: (p: KpiSaleFilters): Promise<KpiSaleLogic> =>
    apiClient.get(`${BASE}/logic`, p),

  // Cấu hình
  configOptions: (): Promise<KpiConfigOptions> =>
    apiClient.get(`${CFG}/options`),
  listRevenueTargets: (year?: number): Promise<KpiRevenueTarget[]> =>
    apiClient.get(`${CFG}/revenue-targets`, { year }),
  listProductTargets: (year?: number): Promise<KpiProductTarget[]> =>
    apiClient.get(`${CFG}/product-targets`, { year }),
  listRepRules: (): Promise<KpiRepRule[]> => apiClient.get(`${CFG}/rep-rules`),
  listIncomeRules: (): Promise<KpiIncomeRule[]> =>
    apiClient.get(`${CFG}/income-rules`),
  listProductMaps: (): Promise<KpiProductMap[]> =>
    apiClient.get(`${CFG}/product-maps`),
  create: (table: KpiConfigTable, data: object) =>
    apiClient.post(`${CFG}/${table}`, data),
  update: (table: KpiConfigTable, id: number, data: object) =>
    apiClient.patch(`${CFG}/${table}/${id}`, data),
  remove: (table: KpiConfigTable, id: number) =>
    apiClient.delete(`${CFG}/${table}/${id}`),
};
