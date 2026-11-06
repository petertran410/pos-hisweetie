import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import {
  analyticsDlclApi,
  type DlclFilters,
  type DlclPage,
  type PivotNode,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { useAuthStore } from "@/lib/store/auth";

// Hook cho các trang Phân tích › Khách Hàng (ĐLCL, Biên Thương Mại, Chi Tiết, Xuất Data).

const KEY = ["reports", "analytics", "khach-hang-dlcl"] as const;

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function useDlclOptions() {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, "options"],
    queryFn: () => analyticsDlclApi.getOptions(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

/** Số liệu 1 trang (T = kiểu dữ liệu trả về của trang). */
export function useDlclReport<T>(page: DlclPage, filters: DlclFilters) {
  const ready = useReady();
  return useQuery({
    queryKey: [...KEY, page, filters],
    queryFn: () => analyticsDlclApi.get<T>(page, filters),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Tải hàng con của 1 khách cha (mở rộng matrix), có cache theo bộ lọc. */
export function useDlclExpand(page: DlclPage, filters: DlclFilters) {
  const qc = useQueryClient();
  return useCallback(
    async (label: string): Promise<PivotNode[]> => {
      const f = { ...filters, expand: label };
      const res = await qc.fetchQuery({
        queryKey: [...KEY, page, "expand", f],
        queryFn: () => analyticsDlclApi.get<{ children: PivotNode[] }>(page, f),
        staleTime: 60_000,
      });
      return res.children ?? [];
    },
    [qc, page, filters],
  );
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const CFG_KEY = ["reports", "analytics", "config", "khach-hang-dlcl"] as const;

export function useStrategicPrograms() {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "programs"],
    queryFn: () => analyticsDlclApi.listPrograms(),
    enabled: ready,
  });
}

export function useStrategicDistributors(program: string) {
  const ready = useReady();
  return useQuery({
    queryKey: [...CFG_KEY, "distributors", program],
    queryFn: () => analyticsDlclApi.listDistributors(program),
    enabled: ready && !!program,
  });
}
