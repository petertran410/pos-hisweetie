import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { internalFinanceApi } from "@/lib/api/internal-finance";
import { useAuthStore } from "@/lib/store/auth";

export interface FinanceAccess {
  /** Đã có kết quả quyền từ máy chủ. */
  ready: boolean;
  superAdmin: boolean;
  /** Có quyền `resource:action` tại chi nhánh này không. */
  can: (resource: string, action: string, branchId: number) => boolean;
  /** Các chi nhánh (trong `candidates`) có ít nhất một trong các quyền. */
  branches: (
    resource: string,
    actions: string | string[],
    candidates?: number[],
  ) => number[];
  /** Có quyền ở ít nhất một chi nhánh. */
  any: (resource: string, action: string) => boolean;
}

const FINANCE_BRANCH_IDS = [6, 1, 4, 7];

/**
 * Quyền tài chính theo vai trò × chi nhánh: user làm được việc X ở chi nhánh B
 * khi B thuộc danh sách chi nhánh của user và vai trò tại B có quyền X.
 */
export function useFinanceAccess(): FinanceAccess {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const query = useQuery({
    queryKey: ["internal-finance", "access"],
    queryFn: internalFinanceApi.access,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const data = query.data;
  const byBranch = useMemo(
    () =>
      new Map(
        (data?.branches || []).map((row) => [
          row.branchId,
          new Set(row.permissions),
        ]),
      ),
    [data],
  );
  const superAdmin = Boolean(data?.superAdmin);
  const can = useCallback(
    (resource: string, action: string, branchId: number) =>
      superAdmin ||
      Boolean(byBranch.get(Number(branchId))?.has(`${resource}:${action}`)),
    [byBranch, superAdmin],
  );
  const branches = useCallback(
    (
      resource: string,
      actions: string | string[],
      candidates: number[] = FINANCE_BRANCH_IDS,
    ) => {
      const wanted = Array.isArray(actions) ? actions : [actions];
      return candidates.filter((branchId) =>
        wanted.some((action) => can(resource, action, branchId)),
      );
    },
    [can],
  );
  const any = useCallback(
    (resource: string, action: string) => branches(resource, action).length > 0,
    [branches],
  );
  const ready = !query.isLoading;
  // Giữ nguyên tham chiếu giữa các lần render để dùng được trong deps.
  return useMemo(
    () => ({ ready, superAdmin, can, branches, any }),
    [ready, superAdmin, can, branches, any],
  );
}
