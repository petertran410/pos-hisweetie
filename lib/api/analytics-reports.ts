import { apiClient } from "@/lib/config/api";

// Báo cáo "Phân tích" (thay Power BI). Backend: /reports/analytics/*

export type AnalyticsAxis = "month" | "day" | "weekday";
export type AnalyticsMetric = "amount" | "orders" | "quantity" | "customers";

export interface AnalyticsBusinessFilters {
  year: number;
  months?: number[];
  axis?: AnalyticsAxis;
  saleTeamId?: number;
  customerGroupId?: number;
  productGroup?: string;
  visualProductGroup?: string;
  parentName?: string;
  region?: string;
}

export interface MetricValues {
  amount: number;
  orders: number;
  customers: number;
  quantity: number;
}

export interface MetricRow extends MetricValues {
  key: string | null;
}

export interface CardValue {
  current: number | null;
  previous: number | null;
  growth: number | null;
}

export interface BusinessOverview {
  period: { from: string; to: string; months: number[]; year: number } | null;
  compareLabel: string | null;
  compareRange?: { from: string; to: string };
  productFilter: boolean;
  axis: AnalyticsAxis;
  updatedAt: string;
  cards: {
    revenue: CardValue;
    quantity: CardValue;
    aov: CardValue;
    arpc: CardValue;
  } | null;
  charts: {
    total: MetricRow;
    byYear: MetricRow[];
    byPeriod: {
      key: string;
      label: string;
      current: MetricRow;
      previous: MetricRow;
    }[];
    byVipCustomer: MetricRow[];
    byCustomerType: MetricRow[];
    byProductType: MetricRow[];
    byBrand: MetricRow[];
    byCategory: MetricRow[];
  } | null;
}

export interface AnalyticsFilterOptions {
  years: number[];
  saleTeams: { id: number; code: string; name: string }[];
  customerGroups: { id: number; name: string }[];
  productGroups: string[];
  visualProductGroups: string[];
  vipParents: string[];
  regions: string[];
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export interface ParentRule {
  id: number;
  matchType: "code" | "name_contains";
  pattern: string;
  parentName: string;
  priority: number;
  isActive: boolean;
}

export interface SaleTeam {
  id: number;
  code: string;
  name: string;
  isSale: boolean;
  sortOrder: number;
  _count?: { members: number };
}

export interface TeamMember {
  userId: number;
  name: string;
  email: string;
  isActive: boolean;
  teamId: number | null;
}

export interface ProductGroupRow {
  id: number;
  productCode: string;
  productName: string | null;
  groupName: string;
}

const CFG = "/reports/analytics/config";

export const analyticsReportApi = {
  getBusinessOverview: (
    p: AnalyticsBusinessFilters,
  ): Promise<BusinessOverview> =>
    apiClient.get("/reports/analytics/business-overview", p),
  getFilterOptions: (): Promise<AnalyticsFilterOptions> =>
    apiClient.get("/reports/analytics/filter-options"),

  // Quy tắc khách cha
  listParentRules: (search?: string): Promise<ParentRule[]> =>
    apiClient.get(`${CFG}/parent-rules`, { search: search || undefined }),
  previewParent: (
    search: string,
  ): Promise<{ code: string; name: string; parent_name: string }[]> =>
    apiClient.get(`${CFG}/parent-rules/preview`, { search }),
  createParentRule: (
    data: Omit<ParentRule, "id" | "isActive"> & { isActive?: boolean },
  ) => apiClient.post(`${CFG}/parent-rules`, data),
  updateParentRule: (id: number, data: Partial<Omit<ParentRule, "id">>) =>
    apiClient.patch(`${CFG}/parent-rules/${id}`, data),
  deleteParentRule: (id: number) =>
    apiClient.delete(`${CFG}/parent-rules/${id}`),

  // Team sale
  listTeams: (): Promise<SaleTeam[]> => apiClient.get(`${CFG}/sale-teams`),
  createTeam: (data: {
    code: string;
    name: string;
    isSale?: boolean;
    sortOrder?: number;
  }) => apiClient.post(`${CFG}/sale-teams`, data),
  updateTeam: (
    id: number,
    data: { name?: string; isSale?: boolean; sortOrder?: number },
  ) => apiClient.patch(`${CFG}/sale-teams/${id}`, data),
  deleteTeam: (id: number) => apiClient.delete(`${CFG}/sale-teams/${id}`),

  // Thành viên team
  listMembers: (search?: string): Promise<TeamMember[]> =>
    apiClient.get(`${CFG}/sale-team-members`, { search: search || undefined }),
  setMember: (userId: number, teamId: number | null) =>
    apiClient.put(`${CFG}/sale-team-members/${userId}`, { teamId }),

  // Nhóm hàng 2026
  listProductGroups: (p: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ProductGroupRow[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get(`${CFG}/product-groups`, {
      ...p,
      search: p.search || undefined,
    }),
  createProductGroup: (data: { productCode: string; groupName: string }) =>
    apiClient.post(`${CFG}/product-groups`, data),
  updateProductGroup: (id: number, groupName: string) =>
    apiClient.patch(`${CFG}/product-groups/${id}`, { groupName }),
  deleteProductGroup: (id: number) =>
    apiClient.delete(`${CFG}/product-groups/${id}`),
};
