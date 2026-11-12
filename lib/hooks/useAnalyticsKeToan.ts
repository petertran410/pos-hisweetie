import { keepPreviousData } from "@tanstack/react-query";
import { useAnalyticsQuery } from "@/lib/hooks/analyticsQuery";
import {
  analyticsKeToanApi,
  CashFilters,
  MisaFilters,
  TransferFilters,
} from "@/lib/api/analytics-ke-toan";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho báo cáo Phân tích › Kế Toán.

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

const KEY = ["reports", "analytics", "ke-toan"] as const;

export function useMappingMisa(filters: MisaFilters) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "mapping-misa", filters],
    queryFn: () => analyticsKeToanApi.getMappingMisa(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useTienMatKho(filters: CashFilters) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "tien-mat-kho", filters],
    queryFn: () => analyticsKeToanApi.getTienMatKho(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useDoiSoat(filters: CashFilters) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "doi-soat", filters],
    queryFn: () => analyticsKeToanApi.getDoiSoat(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useChuyenHang(filters: TransferFilters) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "chuyen-hang", filters],
    queryFn: () => analyticsKeToanApi.getChuyenHang(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
