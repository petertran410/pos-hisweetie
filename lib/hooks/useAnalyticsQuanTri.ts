import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyticsQuanTriApi,
  type QtFilters,
  type QtProfitView,
} from "@/lib/api/analytics-quan-tri";
import { useAuthStore } from "@/lib/store/auth";

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

const KEY = ["reports", "analytics", "quan-tri"] as const;

export function useQtFilterOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "filter-options"],
    queryFn: () => analyticsQuanTriApi.getFilterOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useQtOverview(filters: QtFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "tong-quan", filters],
    queryFn: () => analyticsQuanTriApi.getOverview(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useQtProfit(filters: QtFilters, view: QtProfitView) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "loi-nhuan", view, filters],
    queryFn: () => analyticsQuanTriApi.getProfit({ ...filters, view }),
    enabled: ready,
    placeholderData: (prev, q) => (q?.queryKey[4] === view ? prev : undefined),
    staleTime: 60_000,
  });
}

export function useQtCustomers(filters: QtFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "khach-hang", filters],
    queryFn: () => analyticsQuanTriApi.getCustomers(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useQtProducts(filters: QtFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "san-pham", filters],
    queryFn: () => analyticsQuanTriApi.getProducts(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// ── Cấu hình ───────────────────────────────────────────────────────────────
export function useQtExclusions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "config", "exclusions"],
    queryFn: () => analyticsQuanTriApi.listExclusions(),
    enabled: ready,
  });
}

/** Mutation cấu hình: tải lại cấu hình + số liệu báo cáo sau khi lưu. */
export function useQtConfigMutation<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY] });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });
}
