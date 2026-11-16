import { useCallback } from "react";
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ANALYTICS_STALE_MS,
  useAnalyticsQuery,
} from "@/lib/hooks/analyticsQuery";
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

/**
 * Bộ lọc lúc mới mở Kinh Doanh › Tổng Quan. Trang và phần tải trước PHẢI dùng chung
 * hàm này: queryKey trùng nhau thì trang mới dùng lại được request đã gửi lúc bấm.
 */
export const defaultBusinessFilters = (): AnalyticsBusinessFilters => ({
  year: new Date().getFullYear(),
  axis: "month",
});

const businessOverviewQuery = (filters: AnalyticsBusinessFilters) => ({
  queryKey: ["reports", "analytics", "business-overview", filters] as const,
  queryFn: () => analyticsReportApi.getBusinessOverview(filters),
});

const filterOptionsQuery = {
  queryKey: ["reports", "analytics", "filter-options"] as const,
  queryFn: () => analyticsReportApi.getFilterOptions(),
};

export function useBusinessOverview(filters: AnalyticsBusinessFilters) {
  const ready = useReady();
  return useAnalyticsQuery({
    ...businessOverviewQuery(filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useAnalyticsFilterOptions() {
  const ready = useReady();
  return useAnalyticsQuery({
    ...filterOptionsQuery,
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

/**
 * Gửi sẵn request của Kinh Doanh › Tổng Quan (bộ lọc mặc định + danh sách bộ lọc).
 * Gọi ngay lúc người dùng bấm vào báo cáo: backend tính số song song với lúc trình
 * duyệt tải + dựng trang, thay vì chờ trang dựng xong mới bắt đầu hỏi số liệu.
 * Số còn mới (5 phút) hoặc request đang chạy thì không gửi thêm.
 */
export function usePrefetchBusinessOverview() {
  const qc = useQueryClient();
  const ready = useReady();
  return useCallback(() => {
    if (!ready) return;
    const staleTime = ANALYTICS_STALE_MS;
    void qc.prefetchQuery({
      ...businessOverviewQuery(defaultBusinessFilters()),
      staleTime,
    });
    void qc.prefetchQuery({ ...filterOptionsQuery, staleTime });
  }, [qc, ready]);
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = ["reports", "analytics", "config"] as const;

export function useParentRules(search?: string) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "parent-rules", search ?? ""],
    queryFn: () => analyticsReportApi.listParentRules(search),
    enabled: ready,
  });
}

export function useParentPreview(search: string) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "parent-preview", search],
    queryFn: () => analyticsReportApi.previewParent(search),
    enabled: ready && search.trim().length >= 2,
  });
}

export function useSaleTeams() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "sale-teams"],
    queryFn: () => analyticsReportApi.listTeams(),
    enabled: ready,
  });
}

export function useTeamMembers(search?: string) {
  const ready = useReady();
  return useAnalyticsQuery({
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
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "product-groups", p],
    queryFn: () => analyticsReportApi.listProductGroups(p),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

/** Quy tắc nhóm hàng hiển thị (đủ danh sách, theo thứ tự). */
export function useVisualGroupRules() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "visual-group-rules"],
    queryFn: () => analyticsReportApi.listVisualGroupRules(),
    enabled: ready,
  });
}

/** Giá trị chọn được cho điều kiện quy tắc (loại hàng / nguồn gốc / thương hiệu / danh mục). */
export function useVisualGroupRuleOptions() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "visual-group-rules", "options"],
    queryFn: () => analyticsReportApi.visualGroupRuleOptions(),
    enabled: ready,
  });
}

/** Mutation dùng chung cho màn cấu hình: tải lại cấu hình + số liệu báo cáo sau khi lưu. */
export function useAnalyticsConfigMutation<TArgs, TResult = unknown>(
  fn: (args: TArgs) => Promise<TResult>,
  /** Chuỗi cố định, hoặc hàm tạo thông báo từ kết quả trả về. */
  successMessage: string | ((result: TResult) => string),
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["reports", "analytics"] });
      toast.success(
        typeof successMessage === "function"
          ? successMessage(result)
          : successMessage,
      );
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });
}
