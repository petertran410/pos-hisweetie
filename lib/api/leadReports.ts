import { apiClient } from "@/lib/config/api";
import type {
  LeadDashboardData,
  LeadDashboardFilters,
  LeadFilterOptions,
} from "@/lib/dashboard/lead/leadDashboard.types";

/** Bộ lọc → query string (CSV cho nguồn / phân loại, giống GET /leads). */
const toParams = (f: LeadDashboardFilters) => ({
  from: f.from ?? undefined,
  to: f.to ?? undefined,
  sources: f.sources.length ? f.sources.join(",") : undefined,
  categories: f.categories.length ? f.categories.join(",") : undefined,
  cskhUserId: f.cskhUserId ?? undefined,
  salePicId: f.salePicId ?? undefined,
});

export const leadReportsApi = {
  summary: (f: LeadDashboardFilters): Promise<LeadDashboardData> =>
    apiClient.get("/reports/leads/summary", toParams(f)),
  filterOptions: (): Promise<LeadFilterOptions> =>
    apiClient.get("/reports/leads/filter-options"),
};
