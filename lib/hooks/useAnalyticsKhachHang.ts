import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AnalyticsAxis } from "@/lib/api/analytics-reports";
import {
  analyticsKhachHangApi,
  type KhDemandFilters,
  type KhFilters,
  type KhListKey,
  type KhWeeklyFilters,
} from "@/lib/api/analytics-khach-hang";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho báo cáo Phân tích › Khách Hàng (theo mẫu useAnalyticsReports).

const KEY = ["reports", "analytics", "khach-hang"] as const;

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function useKhFilterOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "bo-loc"],
    queryFn: () => analyticsKhachHangApi.getFilterOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useKhOverview(filters: KhFilters & { axis?: AnalyticsAxis }) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "tong-quan", filters],
    queryFn: () => analyticsKhachHangApi.getOverview(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKhWeekly(kind: "vip" | "key", filters: KhWeeklyFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "weekly", kind, filters],
    queryFn: () => analyticsKhachHangApi.getWeekly(kind, filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKhRepeat(filters: KhFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "khach-quay-lai", filters],
    queryFn: () => analyticsKhachHangApi.getRepeat(filters),
    enabled: ready && filters.months?.length === 1,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKhNewCustomers(filters: KhFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "khach-moi", filters],
    queryFn: () => analyticsKhachHangApi.getNewCustomers(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKhChurn(filters: KhFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "khach-roi-bo", filters],
    queryFn: () => analyticsKhachHangApi.getChurn(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKhDemand(filters: KhDemandFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "demand", filters],
    queryFn: () => analyticsKhachHangApi.getDemand(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = ["reports", "analytics", "config", "khach-hang"] as const;

export function useKhCustomerList(listKey: KhListKey) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "customer-lists", listKey],
    queryFn: () => analyticsKhachHangApi.listCustomerList(listKey),
    enabled: ready,
  });
}

export function useKhSalePics() {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "sale-pics"],
    queryFn: () => analyticsKhachHangApi.listSalePics(),
    enabled: ready,
  });
}

export function useKhSaleRepRules() {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "sale-rep-rules"],
    queryFn: () => analyticsKhachHangApi.listSaleRepRules(),
    enabled: ready,
  });
}
