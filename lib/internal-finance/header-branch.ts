import { useEffect, useRef } from "react";
import { useBranchStore } from "@/lib/store/branch";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";

/**
 * Chi nhánh đang chọn ở header nếu trang này dùng được (thuộc `candidates` và
 * user có quyền xem), ngược lại null để trang hiện mọi chi nhánh được phép.
 */
export function useHeaderBranchId(
  candidates: readonly number[],
  canView: (branchId: number) => boolean,
): number | null {
  const selectedId = useBranchStore((state) => state.selectedBranch?.id);
  const { ready } = useFinanceAccess();
  if (!selectedId || !candidates.includes(selectedId)) return null;
  // Chưa có kết quả quyền thì tạm tin header để không tải thừa mọi chi nhánh.
  return !ready || canView(selectedId) ? selectedId : null;
}

/**
 * Giống bộ lọc hóa đơn: đổi chi nhánh ở header thì bộ lọc đổi theo, trừ khi
 * user đã chủ động chọn nhiều chi nhánh hoặc "Tất cả chi nhánh" ở sidebar.
 */
export function useFollowHeaderBranch(
  headerBranchId: number | null,
  current: number[],
  apply: (branchId: number | null) => void,
) {
  const last = useRef(headerBranchId);
  useEffect(() => {
    if (headerBranchId === last.current) return;
    const following =
      current.length === 1 || (current.length === 0 && last.current === null);
    last.current = headerBranchId;
    if (following) apply(headerBranchId);
  }, [headerBranchId, current, apply]);
}

/**
 * Chi nhánh mặc định khi tạo phiếu: chi nhánh ở header nếu được tạo ở đó,
 * không thì chi nhánh đầu tiên được phép (trang riêng /phieu-kho).
 */
export function useCreateBranchId(
  resource: string,
  candidates: readonly number[],
): number {
  const access = useFinanceAccess();
  const headerId = useHeaderBranchId(candidates, (id) =>
    access.can(resource, "create", id),
  );
  return (
    headerId ??
    access.branches(resource, "create", [...candidates])[0] ??
    candidates[0]
  );
}
