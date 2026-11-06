import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  kpiSaleApi,
  type KpiConfigTable,
  type KpiSaleDailyFilters,
  type KpiSaleFilters,
  type KpiSaleOrderFilters,
} from "@/lib/api/analytics-kpi-sale";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho Phân tích › KPI Sale (theo mẫu useAnalyticsReports).

const KEY = ["reports", "analytics", "kpi-sale"] as const;

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function useKpiSaleOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "options"],
    queryFn: () => kpiSaleApi.options(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useKpiSaleIncome(f: KpiSaleFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "sale-income", f],
    queryFn: () => kpiSaleApi.saleIncome(f),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKpiSaleDaily(f: KpiSaleDailyFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "theo-ngay", f],
    queryFn: () => kpiSaleApi.daily(f),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKpiSaleOrder(f: KpiSaleOrderFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "len-don-ho", f],
    queryFn: () => kpiSaleApi.orderOnBehalf(f),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useKpiSaleLogic(f: KpiSaleFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "logic", f],
    queryFn: () => kpiSaleApi.logic(f),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = [...KEY, "config"] as const;

export function useKpiConfigOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "options"],
    queryFn: () => kpiSaleApi.configOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useKpiConfigList<T>(
  table: KpiConfigTable,
  fetcher: () => Promise<T[]>,
  extraKey: unknown = null,
) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, table, extraKey],
    queryFn: fetcher,
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

/** Thêm / sửa / xoá 1 dòng cấu hình; xong thì tải lại cấu hình + số liệu KPI Sale. */
export function useKpiConfigMutation() {
  const qc = useQueryClient();
  const done = (msg: string) => () => {
    qc.invalidateQueries({ queryKey: KEY });
    toast.success(msg);
  };
  const fail = (e: Error) => toast.error(e.message || "Không lưu được");
  return {
    create: useMutation({
      mutationFn: (a: { table: KpiConfigTable; data: object }) =>
        kpiSaleApi.create(a.table, a.data),
      onSuccess: done("Đã thêm"),
      onError: fail,
    }),
    update: useMutation({
      mutationFn: (a: { table: KpiConfigTable; id: number; data: object }) =>
        kpiSaleApi.update(a.table, a.id, a.data),
      onSuccess: done("Đã lưu"),
      onError: fail,
    }),
    remove: useMutation({
      mutationFn: (a: { table: KpiConfigTable; id: number }) =>
        kpiSaleApi.remove(a.table, a.id),
      onSuccess: done("Đã xoá"),
      onError: fail,
    }),
  };
}
