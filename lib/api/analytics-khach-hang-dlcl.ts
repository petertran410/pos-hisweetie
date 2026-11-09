import { apiClient } from "@/lib/config/api";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";

// Phân tích › Khách Hàng: trang ĐLCL Lermao / Mứt Lermao / Boduo / Phượng Hoàng,
// Biên Thương Mại, Chi Tiết, Xuất Data. Backend: /reports/analytics/khach-hang-dlcl/*

const BASE = "/reports/analytics/khach-hang-dlcl";

export type DlclPage =
  | "dlcl-lermao"
  | "dlcl-mut-lermao"
  | "dlcl-boduo"
  | "dlcl-phuong-hoang"
  | "bien-thuong-mai"
  | "chi-tiet"
  | "xuat-data";

/** Bộ lọc chung (thay các slicer Power BI của các trang). */
export interface DlclFilters {
  year: number;
  years?: number[];
  months?: number[];
  metric?: AnalyticsMetric;
  axis?: AnalyticsAxis;
  columns?: "month" | "week";
  customerType?: string;
  customerGroupId?: number;
  parentName?: string;
  region?: string;
  productGroup?: string;
  productType?: string;
  brand?: string;
  productPhase?: string;
  productName?: string;
  distributorIds?: number[];
  expand?: string;
  full?: boolean;
}

export interface DlclOptions {
  years: number[];
  customerTypes: string[];
  customerGroups: { id: number; name: string }[];
  parentNames: string[];
  regions: string[];
  productGroups: string[];
  productTypes: string[];
  brands: string[];
  productPhases: string[];
  productNames: string[];
}

export interface DlclPeriod {
  from: string;
  to: string;
  months: number[];
  year: number;
  years?: number[];
}

// ── Bảng pivot (matrix) ─────────────────────────────────────────────────────
export type PivotMeasure =
  | "value"
  | "mom"
  | "amount"
  | "orders"
  | "quantity"
  | "general"
  | "diff"
  | "margin";

export interface PivotColumn {
  key: string;
  label: string | null;
  group?: string;
}

export interface PivotNode {
  label: string | null;
  /** cells[cột][measure] */
  cells: (number | null)[][];
  children?: PivotNode[];
  /** Hàng con chưa tải: gọi lại API với expand = label. */
  expandable?: boolean;
}

export interface Pivot {
  columns: PivotColumn[];
  measures: PivotMeasure[];
  rows: PivotNode[];
  total: (number | null)[][];
}

/** Bảng chi tiết (tableEx): mỗi dòng là mảng theo thứ tự `columns`. */
export type DetailRow = [
  string, // date
  string, // invoiceCode
  string | null, // customerName
  string | null, // customerCode
  string | null, // productCode
  string | null, // productName
  number, // quantity
  number, // price
  number, // discount
  number | null, // amount
  boolean, // free (giảm 100% hoá đơn)
  string | null, // parentName
];

export interface DetailTable {
  count: number;
  truncated: boolean;
  columns: string[];
  rows: DetailRow[];
}

export interface StrategicProgram {
  id: number;
  code: string;
  name: string;
  customerGroupName: string | null;
  productType: string | null;
  brand: string | null;
  sortOrder: number;
}

interface PageBase {
  period: DlclPeriod | null;
  updatedAt: string;
}

export interface LermaoReport extends PageBase {
  program: StrategicProgram;
  distributors: { id: number; name: string }[];
  columns: { id: number; name: string }[];
  rows: {
    label: string | null;
    cells: (number | null)[];
    children: { label: string | null; cells: (number | null)[] }[];
  }[];
  total: (number | null)[];
}

export interface MonthPoint {
  key: string;
  label: string;
  value: number | null;
  mom: number | null;
}

export interface MutLermaoReport extends PageBase {
  program: StrategicProgram;
  productFiltered?: boolean;
  byCustomer: Pivot | null;
  byProduct: Pivot | null;
  growth: MonthPoint[];
  detail: DetailTable | null;
}

export interface BoduoReport extends PageBase {
  program: StrategicProgram;
  byCustomer: Pivot | null;
  byCategory: {
    columns: { key: string; label: string | null }[];
    rows: { key: string; label: string; cells: (number | null)[][] }[];
    total: (number | null)[][];
  } | null;
  trend: MonthPoint[];
  pie: { name: string | null; value: number }[];
  detail: DetailTable | null;
}

export interface AxisPoint {
  key: string;
  label: string;
  value: number | null;
  previous?: number | null;
}

export interface PhuongHoangReport extends PageBase {
  program: StrategicProgram;
  axis: AnalyticsAxis;
  top5: { name: string | null; value: number }[];
  trend: AxisPoint[];
  byProduct: Pivot | null;
  byCustomer: Pivot | null;
  detail: DetailTable | null;
}

export interface BienThuongMaiReport extends PageBase {
  cards: {
    amount: number;
    general: number;
    diff: number;
    margin: number | null;
    activeCustomers: number;
  } | null;
  pivot: Pivot | null;
}

export interface CustomerTypeRow {
  customerType: string | null;
  quantity: number | null;
  orders: number;
  amount: number;
  aov: number | null;
  aoc: number | null;
  arpc: number | null;
  newCustomers: number;
}

export interface ChiTietReport extends PageBase {
  axis: AnalyticsAxis;
  mode: "month" | "week";
  productFiltered?: boolean;
  byType: { rows: CustomerTypeRow[]; total: CustomerTypeRow } | null;
  trend: AxisPoint[];
  pivot: Pivot | null;
}

export interface XuatDataReport extends PageBase {
  productFiltered?: boolean;
  pivot: Pivot | null;
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export interface StrategicDistributor {
  id: number;
  programCode: string;
  name: string;
  customerCodes: string[];
  matchAll: boolean;
  sortOrder: number;
  isActive: boolean;
  note: string | null;
  matches?: { code: string; name: string }[];
}

export interface StrategicProgramsConfig {
  programs: StrategicProgram[];
  customerGroups: string[];
  productTypes: string[];
  brands: string[];
}

export type DistributorInput = Omit<
  StrategicDistributor,
  "id" | "matches" | "isActive" | "note"
> & { isActive?: boolean; note?: string | null };

const CFG = `${BASE}/config`;

export const analyticsDlclApi = {
  getOptions: (): Promise<DlclOptions> => apiClient.get(`${BASE}/options`),
  get: <T>(page: DlclPage, f: DlclFilters): Promise<T> =>
    apiClient.get(`${BASE}/${page}`, { ...f }),

  // Cấu hình chương trình ĐLCL / đại lý
  listPrograms: (): Promise<StrategicProgramsConfig> =>
    apiClient.get(`${CFG}/programs`),
  updateProgram: (
    code: string,
    data: Partial<
      Pick<
        StrategicProgram,
        "name" | "customerGroupName" | "productType" | "brand"
      >
    >,
  ) => apiClient.patch(`${CFG}/programs/${encodeURIComponent(code)}`, data),
  listDistributors: (program?: string): Promise<StrategicDistributor[]> =>
    apiClient.get(`${CFG}/distributors`, { program: program || undefined }),
  createDistributor: (data: DistributorInput) =>
    apiClient.post(`${CFG}/distributors`, data),
  updateDistributor: (id: number, data: Partial<DistributorInput>) =>
    apiClient.patch(`${CFG}/distributors/${id}`, data),
  deleteDistributor: (id: number) =>
    apiClient.delete(`${CFG}/distributors/${id}`),
};
