import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAnalyticsQuery } from "@/lib/hooks/analyticsQuery";
import { toast } from "sonner";
import {
  analyticsMuaHangApi,
  type MuaHangDemandFilters,
  type MuaHangFilters,
  type MuaHangSalesFilters,
} from "@/lib/api/analytics-mua-hang";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho Phân tích › Chuyển Kho + Thu Mua (theo mẫu useAnalyticsReports).

const KEY = ["reports", "analytics", "mua-hang"] as const;

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

function useReport<P, T>(
  name: string,
  params: P,
  fn: (p: P) => Promise<T>,
  enabled = true,
) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, name, params],
    queryFn: () => fn(params),
    enabled: ready && enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useMuaHangFilterOptions() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...KEY, "filter-options"],
    queryFn: () => analyticsMuaHangApi.getFilterOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export const useChuyenKho = (f: MuaHangFilters) =>
  useReport("chuyen-kho", f, analyticsMuaHangApi.getChuyenKho);
export const useHangLoaiB = (f: MuaHangFilters) =>
  useReport("hang-loai-b", f, analyticsMuaHangApi.getHangLoaiB);
export const useTonKho = (f: MuaHangFilters) =>
  useReport("ton-kho", f, analyticsMuaHangApi.getTonKho);
export const useNhomHang = (f: MuaHangSalesFilters, enabled = true) =>
  useReport("nhom-hang", f, analyticsMuaHangApi.getNhomHang, enabled);
export const useNguonHang = (f: MuaHangSalesFilters, enabled = true) =>
  useReport("nguon-hang", f, analyticsMuaHangApi.getNguonHang, enabled);
export const useDatTheoDon = (f: MuaHangDemandFilters) =>
  useReport("dat-theo-don", f, analyticsMuaHangApi.getDatTheoDon);

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = [...KEY, "config"] as const;

export function useCodeMerges(search?: string) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "code-merges", search ?? ""],
    queryFn: () => analyticsMuaHangApi.listCodeMerges(search),
    enabled: ready,
  });
}

export function useExcludedSellers() {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "excluded-sellers"],
    queryFn: () => analyticsMuaHangApi.listExcludedSellers(),
    enabled: ready,
  });
}

export function usePurchaseProducts(p: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "purchase-products", p],
    queryFn: () => analyticsMuaHangApi.listPurchaseProducts(p),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useRebates(search?: string) {
  const ready = useReady();
  return useAnalyticsQuery({
    queryKey: [...CFG_KEY, "rebates", search ?? ""],
    queryFn: () => analyticsMuaHangApi.listRebates(search),
    enabled: ready,
  });
}

/** Mutation cấu hình: tải lại cấu hình + số liệu Chuyển Kho / Thu Mua sau khi lưu. */
export function useMuaHangConfigMutation<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });
}
