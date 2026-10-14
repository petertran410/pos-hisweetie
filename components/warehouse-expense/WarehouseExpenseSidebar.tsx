"use client";

import { useEffect, useMemo } from "react";
import {
  FilterDivider,
  FilterSection,
  FinanceFilterSidebar,
} from "@/components/internal-finance/FinanceFilterSidebar";
import { TimeRangeFilter } from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import type { WarehouseExpenseQuery } from "@/lib/api/internal-finance";
import { WAREHOUSE_EXPENSE_ITEMS } from "@/lib/internal-finance/vehicle-constants";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  useFollowHeaderBranch,
  useHeaderBranchId,
} from "@/lib/internal-finance/header-branch";
import { restoreBranchIds } from "@/lib/internal-finance/saved-filters";
import {
  loadSavedDates,
  useSavedTimeRange,
} from "@/lib/internal-finance/time-range";

const EXPENSE_BRANCH_IDS = [1, 4, 6, 7];
const STORAGE_KEY = "warehouse-expense-sidebar-filters";

const CATEGORY_OPTIONS = [
  { value: "DELIVERY_FEE", label: "Chi phí giao hàng" },
  { value: "FUEL", label: "Xăng dầu" },
  { value: "VEHICLE_CARE", label: "Chăm sóc xe" },
  { value: "OTHER_EXPENSE", label: "Chi phí khác" },
];

const CASH_ISSUED_OPTIONS = [
  { value: "NOT_ISSUED", label: "Chưa chi" },
  { value: "ISSUED", label: "Đã chi" },
];

const CHECK_OPTIONS = [
  { value: "CHECKED", label: "Đã đủ hai tick" },
  { value: "UNCHECKED", label: "Chưa đủ hai tick" },
];

const STATUS_OPTIONS = [
  { value: "PENDING_ACCOUNTANT", label: "Chờ kiểm tra" },
  { value: "MANAGER_APPROVED", label: "Đã kiểm tra" },
  { value: "READY_FOR_WEEKLY_APPROVAL", label: "Đã gom tuần" },
  { value: "IN_WEEKLY_APPROVAL", label: "Đang duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "POSTED", label: "Đã ghi sổ" },
  { value: "REJECTED", label: "Từ chối" },
];

export type WarehouseExpenseSidebarFilters = Pick<
  WarehouseExpenseQuery,
  | "branchId"
  | "category"
  | "status"
  | "cashIssued"
  | "checkStatus"
  | "payerId"
  | "expenseItem"
  | "fromDate"
  | "toDate"
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
  // Ô chọn một chi nhánh: chỉ giữ lựa chọn "Tất cả chi nhánh", còn lại theo header.
  const branchId = restoreBranchIds(
    (saved as { branchIds?: unknown }).branchIds,
    headerBranchId,
    EXPENSE_BRANCH_IDS,
  )[0];

  return {
    branchId,
    category: saved.category || undefined,
    status: saved.status || undefined,
    cashIssued: saved.cashIssued || undefined,
    checkStatus: saved.checkStatus || undefined,
    payerId: Number(saved.payerId) || undefined,
    expenseItem: saved.expenseItem || undefined,
    ...loadSavedDates(STORAGE_KEY),
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
  const { data: users } = useUsersForFilter();
  const access = useFinanceAccess();
  const userOptions = useMemo(
    () =>
      (users || []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [users],
  );
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
      return access.can("warehouse_expense", "view", branch.id);
    });
  }, [branchData, access]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        branchIds: filters.branchId ? [filters.branchId] : [],
        category: filters.category || "",
        status: filters.status || "",
        cashIssued: filters.cashIssued || "",
        checkStatus: filters.checkStatus || "",
        payerId: filters.payerId || "",
        expenseItem: filters.expenseItem || "",
        fromDate: filters.fromDate || "",
        toDate: filters.toDate || "",
      }),
    );
  }, [
    filters.branchId,
    filters.category,
    filters.status,
    filters.cashIssued,
    filters.checkStatus,
    filters.payerId,
    filters.expenseItem,
    filters.fromDate,
    filters.toDate,
  ]);

  const headerBranchId = useHeaderBranchId(EXPENSE_BRANCH_IDS, (id) =>
    access.can("warehouse_expense", "view", id),
  );
  useFollowHeaderBranch(
    headerBranchId,
    filters.branchId ? [filters.branchId] : [],
    (id) => onChange({ branchId: id || undefined }),
  );

  const time = useSavedTimeRange(STORAGE_KEY, onChange);

  const activeCount = [
    filters.branchId,
    filters.category,
    filters.status,
    filters.cashIssued,
    filters.checkStatus,
    filters.payerId,
    filters.expenseItem,
    time.active,
  ].filter(Boolean).length;

  const clearAll = () => {
    time.reset();
    onChange({
      branchId: headerBranchId || undefined,
      category: undefined,
      status: undefined,
      cashIssued: undefined,
      checkStatus: undefined,
      payerId: undefined,
      expenseItem: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const select = (
    value: string | undefined,
    options: Array<{ value: string; label: string }>,
    placeholder: string,
    onSelect: (value: string | undefined) => void,
    searchable = false,
  ) => (
    <FilterSearchableSelect
      options={options}
      value={value || ""}
      onChange={(next) => onSelect(next || undefined)}
      placeholder={placeholder}
      searchable={searchable}
    />
  );

  return (
    <FinanceFilterSidebar activeCount={activeCount} onClear={clearAll}>
      <TimeRangeFilter
        label="Thời gian"
        value={time.range}
        onChange={time.change}
      />
      <FilterDivider />
      <FilterSection label="Chi nhánh">
        {select(
          filters.branchId ? String(filters.branchId) : "",
          branches.map((branch) => ({
            value: String(branch.id),
            label: branch.name,
          })),
          "Tất cả chi nhánh",
          (value) => onChange({ branchId: value ? Number(value) : undefined }),
        )}
      </FilterSection>
      <FilterDivider />
      <FilterSection label="Trạng thái">
        {select(filters.status, STATUS_OPTIONS, "Tất cả trạng thái", (value) =>
          onChange({ status: value }),
        )}
      </FilterSection>
      <FilterSection label="Trạng thái chi tiền">
        {select(filters.cashIssued, CASH_ISSUED_OPTIONS, "Tất cả", (value) =>
          onChange({ cashIssued: value as "ISSUED" | "NOT_ISSUED" | undefined }),
        )}
      </FilterSection>
      <FilterSection label="Kiểm tra">
        {select(filters.checkStatus, CHECK_OPTIONS, "Tất cả", (value) =>
          onChange({
            checkStatus: value as "CHECKED" | "UNCHECKED" | undefined,
          }),
        )}
      </FilterSection>
      <FilterDivider />
      <FilterSection label="Nhóm chi phí">
        {select(filters.category, CATEGORY_OPTIONS, "Tất cả nhóm", (value) =>
          onChange({ category: value }),
        )}
      </FilterSection>
      <FilterSection label="Khoản mục">
        {select(
          filters.expenseItem,
          WAREHOUSE_EXPENSE_ITEMS.map((item) => ({ value: item, label: item })),
          "Tất cả khoản mục",
          (value) => onChange({ expenseItem: value }),
          true,
        )}
      </FilterSection>
      <FilterDivider />
      <FilterSection label="Người chi">
        {select(
          filters.payerId ? String(filters.payerId) : "",
          userOptions,
          "Tất cả",
          (value) => onChange({ payerId: value ? Number(value) : undefined }),
          true,
        )}
      </FilterSection>
    </FinanceFilterSidebar>
  );
}
