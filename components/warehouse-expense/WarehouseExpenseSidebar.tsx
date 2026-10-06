"use client";

import { useEffect, useMemo } from "react";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { useBranches } from "@/lib/hooks/useBranches";
import type { WarehouseExpenseQuery } from "@/lib/api/internal-finance";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

const EXPENSE_BRANCH_IDS = [1, 4, 6, 7];
const STORAGE_KEY = "warehouse-expense-sidebar-filters";

const CATEGORY_OPTIONS = [
  { value: "DELIVERY_FEE", label: "Chi phí giao hàng" },
  { value: "FUEL", label: "Xăng dầu" },
  { value: "VEHICLE_CARE", label: "Chăm sóc xe" },
  { value: "OTHER_EXPENSE", label: "Chi phí khác" },
];

const STATUS_OPTIONS = [
  { value: "PENDING_ACCOUNTANT", label: "Chờ kế toán" },
  { value: "READY_FOR_WEEKLY_APPROVAL", label: "Sẵn sàng tổng hợp" },
  { value: "IN_WEEKLY_APPROVAL", label: "Đang duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "POSTED", label: "Đã ghi sổ" },
  { value: "REJECTED", label: "Từ chối" },
];

export type WarehouseExpenseSidebarFilters = Pick<
  WarehouseExpenseQuery,
  "branchId" | "category" | "status" | "cashIssued" | "fromDate" | "toDate"
>;

function readSavedState(): Partial<WarehouseExpenseSidebarFilters> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as Partial<WarehouseExpenseSidebarFilters>)
      : {};
  } catch {
    return {};
  }
}

export function loadWarehouseExpenseFilters(
  headerBranchId?: number | null,
): WarehouseExpenseSidebarFilters {
  const saved = readSavedState();
  const savedBranchId = Number(saved.branchId);
  const branchId = EXPENSE_BRANCH_IDS.includes(savedBranchId)
    ? savedBranchId
    : headerBranchId && EXPENSE_BRANCH_IDS.includes(headerBranchId)
      ? headerBranchId
      : undefined;

  return {
    branchId,
    category: saved.category || undefined,
    status: saved.status || undefined,
    cashIssued: saved.cashIssued || undefined,
    fromDate: saved.fromDate || undefined,
    toDate: saved.toDate || undefined,
  };
}

export function WarehouseExpenseSidebar({
  filters,
  onChange,
}: {
  filters: WarehouseExpenseSidebarFilters;
  onChange: (patch: Partial<WarehouseExpenseSidebarFilters>) => void;
}) {
  const { data: branchData } = useBranches();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string; isActive?: boolean }> }
      | Array<{ id: number; name: string; isActive?: boolean }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    return rows.filter((branch) => {
      if (!EXPENSE_BRANCH_IDS.includes(branch.id) || branch.isActive === false) {
        return false;
      }
      if (user?.roles?.includes("Super Admin")) return true;
      const scope =
        branch.id === 6 ? "hn" : branch.id === 1 ? "sg" : "vp";
      return Boolean(
        user?.permissions?.includes(`warehouse_expense:view_${scope}`) ||
          user?.permissions?.includes(`internal_fund:view_${scope}`),
      );
    });
  }, [branchData, user]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        branchId: filters.branchId || "",
        category: filters.category || "",
        status: filters.status || "",
        cashIssued: filters.cashIssued || "",
        fromDate: filters.fromDate || "",
        toDate: filters.toDate || "",
      }),
    );
  }, [
    filters.branchId,
    filters.category,
    filters.status,
    filters.cashIssued,
    filters.fromDate,
    filters.toDate,
  ]);

  useEffect(() => {
    if (!selectedBranch || filters.branchId) return;
    if (EXPENSE_BRANCH_IDS.includes(selectedBranch.id)) {
      onChange({ branchId: selectedBranch.id });
    }
  }, [filters.branchId, onChange, selectedBranch]);

  const activeCount = [
    filters.branchId,
    filters.category,
    filters.status,
    filters.cashIssued,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;

  const clearAll = () => {
    const headerBranchId =
      selectedBranch && EXPENSE_BRANCH_IDS.includes(selectedBranch.id)
        ? selectedBranch.id
        : undefined;
    onChange({
      branchId: headerBranchId,
      category: undefined,
      status: undefined,
      cashIssued: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <aside className="custom-sidebar-scroll m-4 flex h-[calc(100%-2rem)] min-h-0 w-64 shrink-0 flex-col overflow-y-auto rounded-xl border bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b bg-white px-4 py-2">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-brand hover:text-brand-dark">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Chi nhánh
          </label>
          <select
            value={filters.branchId ? String(filters.branchId) : ""}
            onChange={(event) =>
              onChange({
                branchId: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="dt-select h-10 w-full">
            <option value="">Tất cả chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Khoản mục
          </label>
          <select
            value={filters.category || ""}
            onChange={(event) =>
              onChange({ category: event.target.value || undefined })
            }
            className="dt-select h-10 w-full">
            <option value="">Tất cả khoản mục</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Trạng thái
          </label>
          <select
            value={filters.status || ""}
            onChange={(event) =>
              onChange({ status: event.target.value || undefined })
            }
            className="dt-select h-10 w-full">
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Trạng thái chi tiền
          </label>
          <select
            value={filters.cashIssued || ""}
            onChange={(event) =>
              onChange({
                cashIssued: (event.target.value || undefined) as
                  | "ISSUED"
                  | "NOT_ISSUED"
                  | undefined,
              })
            }
            className="dt-select h-10 w-full">
            <option value="">Tất cả</option>
            <option value="NOT_ISSUED">Chưa chi</option>
            <option value="ISSUED">Đã chi</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Thời gian
          </label>
          <InternalFinanceDateField
            compact
            label="Từ ngày"
            value={filters.fromDate || ""}
            maxDate={filters.toDate || undefined}
            onChange={(value) => onChange({ fromDate: value || undefined })}
          />
          <InternalFinanceDateField
            compact
            label="Đến ngày"
            value={filters.toDate || ""}
            minDate={filters.fromDate || undefined}
            onChange={(value) => onChange({ toDate: value || undefined })}
          />
        </div>
      </div>
    </aside>
  );
}
