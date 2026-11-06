import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  analyticsKdApi,
  CustomerSection,
  DashboardView,
  KdFilters,
  PivotParams,
} from "@/lib/api/analytics-kinh-doanh";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho Phân tích › Kinh Doanh (BC Định Kì, Khách Hàng, Sản Phẩm, Đối Thủ).

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

const KEY = ["reports", "analytics", "kinh-doanh"] as const;

/** Bỏ chỉ số (metric) khỏi khoá cache khi trang không dùng tới — chỉ đổi cách hiển thị. */
function useKdQuery<T>(
  name: string,
  params: unknown,
  fn: () => Promise<T>,
  enabled = true,
) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, name, params],
    queryFn: fn,
    enabled: ready && enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKdOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "options"],
    queryFn: () => analyticsKdApi.options(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function usePeriodicDetail(f: KdFilters, enabled = true) {
  return useKdQuery(
    "bc-dinh-ki",
    f,
    () => analyticsKdApi.periodicDetail(f),
    enabled,
  );
}

export function usePeriodicDashboard(
  f: KdFilters,
  view: DashboardView,
  enabled = true,
) {
  return useKdQuery(
    "bc-dinh-ki-dashboard",
    { ...f, view },
    () => analyticsKdApi.periodicDashboard(f, view),
    enabled,
  );
}

export function usePeriodicRegion(f: KdFilters, enabled = true) {
  return useKdQuery(
    "bc-dinh-ki-vung",
    f,
    () => analyticsKdApi.periodicRegion(f),
    enabled,
  );
}

export function useKdPivot(f: KdFilters, p: PivotParams, enabled = true) {
  return useKdQuery(
    "pivot",
    { ...f, ...p },
    () => analyticsKdApi.pivot(f, p),
    enabled,
  );
}

export function useKdCustomer(
  f: KdFilters,
  section: CustomerSection,
  extra?: { unit?: "base" | "bulk"; demandCustomer?: string },
  enabled = true,
) {
  return useKdQuery(
    "khach-hang",
    { ...f, ...extra, section },
    () => analyticsKdApi.customer(f, section, extra),
    enabled,
  );
}

export function useKdChurn(f: KdFilters, group: string, enabled = true) {
  return useKdQuery(
    "khach-hang-churn",
    { ...f, group },
    () => analyticsKdApi.churn(f, group),
    enabled,
  );
}

export function useKdProduct(f: KdFilters) {
  return useKdQuery("san-pham", f, () => analyticsKdApi.product(f));
}

export function useKdInventory(f: KdFilters, enabled = true) {
  return useKdQuery(
    "san-pham-ton-kho",
    f,
    () => analyticsKdApi.inventory(f),
    enabled,
  );
}

export function useKdCompetitor(f: KdFilters) {
  return useKdQuery("doi-thu", f, () => analyticsKdApi.competitor(f));
}
