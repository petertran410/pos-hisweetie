"use client";

import { useQuery } from "@tanstack/react-query";
import { smaxReportsApi } from "@/lib/api/smaxReports";
import type { SmaxDashboardFilters } from "@/lib/dashboard/smax/smaxDashboard.types";

/** Dashboard Smax chat: số liệu tính ở backend theo bộ lọc (không có quyền xem NV khác → chỉ của mình). */
export function useSmaxDashboard(filters: SmaxDashboardFilters) {
  return useQuery({
    queryKey: ["smax-dashboard", filters],
    queryFn: () => smaxReportsApi.summary(filters),
  });
}

/** Kênh / nhân viên / chi nhánh cho bộ lọc. */
export function useSmaxFilterOptions() {
  return useQuery({
    queryKey: ["smax-dashboard-filter-options"],
    queryFn: () => smaxReportsApi.filterOptions(),
    staleTime: 5 * 60_000,
  });
}
