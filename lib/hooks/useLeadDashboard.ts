"use client";

import { useQuery } from "@tanstack/react-query";
import { leadReportsApi } from "@/lib/api/leadReports";
import type { LeadDashboardFilters } from "@/lib/dashboard/lead/leadDashboard.types";

/** Dashboard Lead: số liệu tính ở backend theo bộ lọc (Sale chỉ thấy lead của mình). */
export function useLeadDashboard(filters: LeadDashboardFilters) {
  return useQuery({
    queryKey: ["lead-dashboard", filters],
    queryFn: () => leadReportsApi.summary(filters),
  });
}

/** Danh sách CSKH / Sale PIC cho bộ lọc. */
export function useLeadFilterOptions() {
  return useQuery({
    queryKey: ["lead-dashboard-filter-options"],
    queryFn: () => leadReportsApi.filterOptions(),
    staleTime: 5 * 60_000,
  });
}
