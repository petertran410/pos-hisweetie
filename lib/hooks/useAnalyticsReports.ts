import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyticsReportApi,
  AnalyticsBusinessFilters,
} from "@/lib/api/analytics-reports";
import { useAuthStore } from "@/lib/store/auth";

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function useBusinessOverview(filters: AnalyticsBusinessFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: ["reports", "analytics", "business-overview", filters],
    queryFn: () => analyticsReportApi.getBusinessOverview(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useAnalyticsFilterOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: ["reports", "analytics", "filter-options"],
    queryFn: () => analyticsReportApi.getFilterOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = ["reports", "analytics", "config"] as const;

export function useParentRules(search?: string) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "parent-rules", search ?? ""],
    queryFn: () => analyticsReportApi.listParentRules(search),
    enabled: ready,
  });
}

export function useParentPreview(search: string) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "parent-preview", search],
    queryFn: () => analyticsReportApi.previewParent(search),
    enabled: ready && search.trim().length >= 2,
  });
}

export function useSaleTeams() {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "sale-teams"],
    queryFn: () => analyticsReportApi.listTeams(),
    enabled: ready,
  });
}

export function useTeamMembers(search?: string) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "members", search ?? ""],
    queryFn: () => analyticsReportApi.listMembers(search),
    enabled: ready,
  });
}

export function useProductGroups(p: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "product-groups", p],
    queryFn: () => analyticsReportApi.listProductGroups(p),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

/** Mutation dùng chung cho màn cấu hình: tải lại cấu hình + số liệu báo cáo sau khi lưu. */
export function useAnalyticsConfigMutation<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "analytics"] });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });
}
