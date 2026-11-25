import { apiClient } from "@/lib/config/api";
import type {
  SmaxDashboardData,
  SmaxDashboardFilters,
  SmaxFilterOptions,
} from "@/lib/dashboard/smax/smaxDashboard.types";

/** Bộ lọc → query string (CSV cho kênh / chi nhánh, giống báo cáo Lead). */
const toParams = (f: SmaxDashboardFilters) => ({
  from: f.from ?? undefined,
  to: f.to ?? undefined,
  pagePids: f.pagePids.length ? f.pagePids.join(",") : undefined,
  userId: f.userId ?? undefined,
  branchIds: f.branchIds.length ? f.branchIds.join(",") : undefined,
});

export const smaxReportsApi = {
  summary: (f: SmaxDashboardFilters): Promise<SmaxDashboardData> =>
    apiClient.get("/reports/smax/summary", toParams(f)),
  filterOptions: (): Promise<SmaxFilterOptions> =>
    apiClient.get("/reports/smax/filter-options"),
};
