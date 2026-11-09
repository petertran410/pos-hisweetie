import { apiClient } from "@/lib/config/api";
import type {
  AnalyticsBusinessFilters,
  AnalyticsFilterOptions,
  BusinessOverview,
} from "@/lib/api/analytics-reports";

// Báo cáo Phân tích › Định Kì + Hằng Tuần (thay Power BI).
// Backend: /reports/analytics/dinh-ki/*  (quyền reports:analytics_periodic)

export interface DkRange {
  from: string;
  to: string;
}

export interface DkGroupRow {
  name: string;
  revenue: number;
  previous: number;
  target: number | null;
  pct: number | null;
}

export interface DkVisualRow {
  name: string;
  revenue: number;
  previous: number;
  share: number | null;
}

export interface DkTeamRow {
  id: number;
  name: string;
  revenue: number;
  orders: number;
  newCustomers: number | null;
  kpiTarget: number;
  kpiPct: number | null;
}

export interface DkTopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface DkTopProducts {
  lermao: DkTopProduct[];
  phuongHoang: DkTopProduct[];
}

export interface DkDebt {
  total: number;
  over30: number;
}

interface Pair {
  current: number;
  previous: number;
}

export interface DkWeeklyReport {
  mode: "this" | "last";
  anchor: string;
  today: string;
  ranges: { cur: DkRange; cur0: DkRange; prev: DkRange };
  kpiMonth: { year: number; month: number };
  updatedAt: string;
  finance: {
    revenue: Pair;
    orders: Pair;
    kpi: { target: number; pct: number | null };
    central: Pair;
  };
  groups: DkGroupRow[];
  visualGroups: DkVisualRow[];
  debt: DkDebt;
  customers: {
    newCurrent: number;
    newPrevious: number;
    revenueNewCurrent: number;
    revenueNewPrevious: number;
  };
  teams: DkTeamRow[];
  topProducts: DkTopProducts | null;
}

export interface DkMonthlyReport {
  anchor: string;
  today: string;
  ranges: { cur: DkRange; prev: DkRange };
  kpiMonth: { year: number; month: number };
  updatedAt: string;
  finance: {
    revenue: Pair;
    orders: Pair;
    kpi: { actual: number; target: number; pct: number | null };
    newCustomers: Pair;
  };
  groups: DkGroupRow[];
  visualGroups: DkVisualRow[];
  debt: DkDebt;
  customers: { revenueNewCurrent: number; revenueNewPrevious: number };
  teams: DkTeamRow[];
  topProducts: DkTopProducts;
}

export interface DkRegionRow {
  region: string;
  revenue: number;
  previous: number;
  share: number | null;
  mom: number | null;
  activeCustomers: number;
  newCustomers: number;
  orders: number;
  aov: number | null;
  customerTypes: { le: number; buon: number; chuoi: number };
  brandProducts: { name: string; revenue: number }[];
  tradeProducts: { name: string; revenue: number }[];
}

export interface DkRegionInsight {
  region: string;
  revenue: number;
  mom: number | null;
  share: number | null;
}

export interface DkRegionReport {
  anchor: string;
  today: string;
  ranges: { cur: DkRange; prev: DkRange };
  updatedAt: string;
  totalRevenue: number;
  insights: {
    topShare: DkRegionInsight | null;
    bestGrowth: DkRegionInsight | null;
    worstGrowth: DkRegionInsight | null;
  };
  regions: DkRegionRow[];
}

export interface DkBrandStats {
  revenue: number;
  quantity: number;
  orders: number;
  customers: number;
}

export interface DkBrandReport {
  period: { from: string; to: string; months: number[]; year: number } | null;
  updatedAt: string;
  brands: { lermao: DkBrandStats; boduo: DkBrandStats } | null;
  flavors?: { flavor: string; lermao: number; boduo: number; total: number }[];
  topLermao?: DkTopProduct[];
  topBoduo?: DkTopProduct[];
  maxProductRevenue?: number;
}

export interface DkDetailRow {
  name: string;
  target: number | null;
  current: number;
  pctCurrent: number | null;
  previous: number;
  pctPrevious: number | null;
}

export interface DkDetailReport {
  anchor: string;
  today: string;
  ranges: { cur: DkRange; cur0: DkRange; prev: DkRange };
  kpiMonth: { year: number; month: number };
  updatedAt: string;
  groups: { rows: DkDetailRow[]; total: Omit<DkDetailRow, "name"> };
  visualGroups: { rows: DkDetailRow[]; total: Omit<DkDetailRow, "name"> };
  staff: { name: string; previous: number; current: number }[];
  regions: { region: string; current: number; previous: number }[];
}

export interface DkDetailFilters {
  date?: string;
  saleTeamId?: number;
  productGroup?: string;
  parentName?: string;
}

// ── Hằng Tuần ────────────────────────────────────────────────────────────────
export interface HangTuanFilters {
  year: number;
  months?: number[];
  weeks?: string[];
  saleTeamIds?: number[];
  sellerGroups?: string[];
}

export interface HangTuanMetrics {
  kpi: number;
  revenue: number;
  kpiPct: number | null;
  previousMtd: number;
  mom: number | null;
  thisWeek: number;
  lastWeek: number;
  wow: number | null;
}

export interface HangTuanOptions {
  weeks: { start: string; label: string }[];
  teams: { id: number; name: string }[];
  sellerGroups: string[];
}

export type HangTuanReport =
  | { empty: true; options: HangTuanOptions; updatedAt: string }
  | {
      empty: false;
      options: HangTuanOptions;
      updatedAt: string;
      refDate: string;
      selection: { from: string; to: string; weeks: number };
      cards: {
        revenueMtd: number;
        previousMtd: number;
        mom: number | null;
        kpi: number;
        remaining: number;
        achieved: number | null;
        revenueNew: number;
        deptKpi: number;
        deptRemaining: number;
        selectedWeek: number;
        selectedWeekRemaining: number;
        deptSelectedWeek: number;
        deptSelectedWeekRemaining: number;
      };
      byMonth: { key: string; revenue: number }[];
      pivot: (HangTuanMetrics & {
        name: string;
        users: (HangTuanMetrics & { name: string })[];
      })[];
      total: HangTuanMetrics;
      cumulative: {
        date: string;
        label: string;
        revenue: number;
        kpi: number;
      }[];
    };

// ── Cấu hình ────────────────────────────────────────────────────────────────
export type DkTargetKind = "group2026" | "visual";

export interface DkGroupTarget {
  id: number;
  kind: DkTargetKind;
  groupName: string;
  year: number;
  month: number;
  kpiValue: number;
}

export interface DkJamFlavor {
  id: number;
  productCode: string;
  productName: string | null;
  jamFlavor: string;
  brand: "Lermao" | "Boduo";
}

export interface DkWeeklySeller {
  userId: number;
  name: string;
  email: string;
  teamName: string | null;
  sellerGroup: string | null;
  sortOrder: number | null;
}

const BASE = "/reports/analytics/dinh-ki";
const CFG = `${BASE}/config`;

export const dinhKiApi = {
  getFilterOptions: (): Promise<AnalyticsFilterOptions> =>
    apiClient.get(`${BASE}/filter-options`),
  getOverview: (p: AnalyticsBusinessFilters): Promise<BusinessOverview> =>
    apiClient.get(`${BASE}/tong-quan`, p),
  getBrandCompare: (p: {
    year: number;
    months?: number[];
  }): Promise<DkBrandReport> => apiClient.get(`${BASE}/doi-thu`, p),
  getWeekly: (mode: "this" | "last", date?: string): Promise<DkWeeklyReport> =>
    apiClient.get(`${BASE}/${mode === "this" ? "tuan-nay" : "tuan-truoc"}`, {
      date,
    }),
  getMonthly: (date?: string): Promise<DkMonthlyReport> =>
    apiClient.get(`${BASE}/thang`, { date }),
  getRegion: (date?: string): Promise<DkRegionReport> =>
    apiClient.get(`${BASE}/vung`, { date }),
  getDetail: (p: DkDetailFilters): Promise<DkDetailReport> =>
    apiClient.get(`${BASE}/chi-tiet`, p),
  getHangTuan: (p: HangTuanFilters): Promise<HangTuanReport> =>
    apiClient.get(`${BASE}/hang-tuan`, p),

  // Cấu hình
  listGroupTargets: (p: {
    kind?: DkTargetKind;
    year?: number;
  }): Promise<DkGroupTarget[]> => apiClient.get(`${CFG}/group-targets`, p),
  upsertGroupTarget: (data: Omit<DkGroupTarget, "id">) =>
    apiClient.post(`${CFG}/group-targets`, data),
  updateGroupTarget: (id: number, kpiValue: number) =>
    apiClient.patch(`${CFG}/group-targets/${id}`, { kpiValue }),
  deleteGroupTarget: (id: number) =>
    apiClient.delete(`${CFG}/group-targets/${id}`),

  listJamFlavors: (search?: string): Promise<DkJamFlavor[]> =>
    apiClient.get(`${CFG}/jam-flavors`, { search: search || undefined }),
  createJamFlavor: (data: {
    productCode: string;
    jamFlavor: string;
    brand: "Lermao" | "Boduo";
  }) => apiClient.post(`${CFG}/jam-flavors`, data),
  updateJamFlavor: (
    id: number,
    data: { jamFlavor?: string; brand?: "Lermao" | "Boduo" },
  ) => apiClient.patch(`${CFG}/jam-flavors/${id}`, data),
  deleteJamFlavor: (id: number) => apiClient.delete(`${CFG}/jam-flavors/${id}`),

  listWeeklySellers: (): Promise<DkWeeklySeller[]> =>
    apiClient.get(`${CFG}/weekly-sellers`),
  setWeeklySeller: (
    userId: number,
    data: { sellerGroup: string; sortOrder?: number },
  ) => apiClient.put(`${CFG}/weekly-sellers/${userId}`, data),
  removeWeeklySeller: (userId: number) =>
    apiClient.delete(`${CFG}/weekly-sellers/${userId}`),
};
