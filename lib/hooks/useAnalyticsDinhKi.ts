import { keepPreviousData } from "@tanstack/react-query";
import { useAnalyticsQuery } from "@/lib/hooks/analyticsQuery";
import type { AnalyticsBusinessFilters } from "@/lib/api/analytics-reports";
import {
  dinhKiApi,
  type DkDetailFilters,
  type DkTargetKind,
  type HangTuanFilters,
} from "@/lib/api/analytics-dinh-ki";
import { useAuthStore } from "@/lib/store/auth";

// Hook báo cáo Phân tích › Định Kì + Hằng Tuần. Mutation cấu hình dùng chung
// useAnalyticsConfigMutation (lib/hooks/useAnalyticsReports) — tải lại mọi số
// liệu ["reports", "analytics", …] sau khi lưu.

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

const KEY = ["reports", "analytics", "dinh-ki"] as const;

function useReport<T>(key: unknown[], fn: () => Promise<T>) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, ...key],
    queryFn: fn,
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useDinhKiFilterOptions() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "filter-options"],
    queryFn: () => dinhKiApi.getFilterOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useDinhKiOverview(filters: AnalyticsBusinessFilters) {
  return useReport(["tong-quan", filters], () =>
    dinhKiApi.getOverview(filters),
  );
}

export function useDinhKiBrandCompare(p: { year: number; months?: number[] }) {
  return useReport(["doi-thu", p], () => dinhKiApi.getBrandCompare(p));
}

export function useDinhKiWeekly(mode: "this" | "last", date?: string) {
  return useReport(["tuan", mode, date ?? ""], () =>
    dinhKiApi.getWeekly(mode, date),
  );
}

export function useDinhKiMonthly(date?: string) {
  return useReport(["thang", date ?? ""], () => dinhKiApi.getMonthly(date));
}

export function useDinhKiRegion(date?: string) {
  return useReport(["vung", date ?? ""], () => dinhKiApi.getRegion(date));
}

export function useDinhKiDetail(p: DkDetailFilters) {
  return useReport(["chi-tiet", p], () => dinhKiApi.getDetail(p));
}

export function useHangTuan(p: HangTuanFilters) {
  return useReport(["hang-tuan", p], () => dinhKiApi.getHangTuan(p));
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
export function useDkGroupTargets(p: { kind?: DkTargetKind; year?: number }) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "config", "group-targets", p],
    queryFn: () => dinhKiApi.listGroupTargets(p),
    enabled: ready,
  });
}

export function useDkJamFlavors(search?: string) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "config", "jam-flavors", search ?? ""],
    queryFn: () => dinhKiApi.listJamFlavors(search),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useDkWeeklySellers() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "config", "weekly-sellers"],
    queryFn: () => dinhKiApi.listWeeklySellers(),
    enabled: ready,
  });
}
