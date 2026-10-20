"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HandCoins, Plus, Undo2, X } from "lucide-react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { MobileFilterDrawer } from "@/components/internal-finance/mobile/FinanceMobileShell";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { CashAdvanceForm } from "@/components/cash-advances/CashAdvanceForm";
import { CashAdvanceMobileList } from "@/components/cash-advances/CashAdvanceMobileList";
import {
  CashAdvanceSidebar,
  loadCashAdvanceFilters,
  type CashAdvanceSidebarFilters,
} from "@/components/cash-advances/CashAdvanceSidebar";
import {
  CASH_ADVANCE_COLUMNS,
  CashAdvanceTable,
} from "@/components/cash-advances/CashAdvanceTable";
import { useCashAdvanceActions } from "@/components/cash-advances/useCashAdvanceActions";
import type { CashAdvanceQuery } from "@/lib/api/cash-advances";
import { useCashAdvances } from "@/lib/hooks/useCashAdvances";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { CASH_ADVANCE_BRANCH_IDS } from "@/lib/cash-advances/display";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useCreateBranchId } from "@/lib/internal-finance/header-branch";
import { useBranchStore } from "@/lib/store/branch";

const STORAGE_KEY = "cash-advance-sidebar-filters";

function CashAdvanceScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Link từ Phiếu chi kho / Quỹ nội bộ: ?Code=<mã tạm ứng>.
  const codeParam = searchParams.get("Code")?.trim() || "";
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const access = useFinanceAccess();
  const isMobile = useIsMobile(768);
  const [filters, setFilters] = useState<CashAdvanceSidebarFilters>(() =>
    loadCashAdvanceFilters(STORAGE_KEY, selectedBranch?.id),
  );
  const [search, setSearch] = useState(codeParam);
  const [debouncedSearch, setDebouncedSearch] = useState(codeParam);
  const [page, setPage] = useState(1);
  const [limit, setLimit, limitOptions] = usePageSize(
    "cashAdvancePageSize",
    30,
    [10, 20, 30, 50, 100],
  );
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { columns, toggleColumn, shows } = useColumnToggle(
    "cashAdvanceTableColumns",
    CASH_ADVANCE_COLUMNS,
  );
  const actions = useCashAdvanceActions();
  const createBranchId = useCreateBranchId(
    "cash_advance",
    CASH_ADVANCE_BRANCH_IDS,
  );
  const canCreate =
    access.branches("cash_advance", "create", CASH_ADVANCE_BRANCH_IDS).length >
    0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clearCodeParam = () => {
    if (!codeParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("Code");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
  };

  const handleFiltersChange = useCallback(
    (patch: Partial<CashAdvanceSidebarFilters>) => {
      setFilters((current) => ({ ...current, ...patch }));
      setPage(1);
    },
    [],
  );

  const query = useMemo<CashAdvanceQuery>(
    () =>
      codeParam && debouncedSearch === codeParam
        ? { search: codeParam, page: 1, limit }
        : {
            branchId: filters.branchId,
            status: filters.status,
            recipientId: filters.personId,
            refundState: filters.refundState,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            search: debouncedSearch || undefined,
            page,
            limit,
          },
    [codeParam, debouncedSearch, filters, limit, page],
  );
  const list = useCashAdvances(query);
  const rows = list.data?.data || [];
  const total = list.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const linkedRow = codeParam
    ? rows.find((row) => row.code === codeParam)
    : undefined;
  const activeFilterCount = [
    filters.branchId,
    filters.status,
    filters.personId,
    filters.refundState,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;

  const form = showForm && (
    <CashAdvanceForm
      branchId={createBranchId}
      onClose={() => setShowForm(false)}
      // Tạo xong in phiếu ngay, giống trang Bán hàng.
      onCreated={(row) => void actions.printById(row.id)}
    />
  );

  const sidebar = (mobile: boolean) => (
    <CashAdvanceSidebar
      resource="cash_advance"
      storageKey={STORAGE_KEY}
      filters={filters}
      onChange={handleFiltersChange}
      personLabel="Người tạm ứng"
      timeLabel="Kỳ tạm ứng"
      showRefundState
      mobileOpen={mobile ? showFilters : undefined}
    />
  );

  return (
    <>
      {isMobile ? (
        <div className="flex h-full min-h-0 flex-col border-t">
          <MobileFilterDrawer
            open={showFilters}
            onClose={() => setShowFilters(false)}>
            {sidebar(true)}
          </MobileFilterDrawer>
          <CashAdvanceMobileList
            rows={rows}
            isLoading={list.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
              if (value.trim() !== codeParam) clearCodeParam();
            }}
            activeFilterCount={activeFilterCount}
            onOpenFilter={() => setShowFilters(true)}
            totals={list.data?.totals}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onCreate={canCreate ? () => setShowForm(true) : undefined}
            actions={actions}
          />
        </div>
      ) : (
        <div className="flex h-full min-h-0 overflow-hidden border-t bg-gray-50">
          {sidebar(false)}
          <main className="m-4 ml-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-brand" />
                  <h1 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Tạm ứng
                  </h1>
                </div>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                      if (event.target.value.trim() !== codeParam)
                        clearCodeParam();
                    }}
                    placeholder="Tìm mã, nội dung, người tạm ứng..."
                    className="h-9 w-64 rounded-lg border px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {search && (
                    <button
                      type="button"
                      title="Xóa tìm kiếm"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                        clearCodeParam();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    <Plus className="h-4 w-4" />
                    Tạo tạm ứng
                  </button>
                )}
                <Link
                  href="/tai-chinh/hoan-ung"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Undo2 className="h-4 w-4" />
                  Hoàn ứng
                </Link>
                <ColumnToggle columns={columns} onToggle={toggleColumn} />
              </div>
            </div>
            {list.isError ? (
              <div className="flex flex-1 items-center justify-center text-sm text-red-600">
                {list.error instanceof Error
                  ? list.error.message
                  : "Không tải được dữ liệu"}
              </div>
            ) : (
              <CashAdvanceTable
                rows={rows}
                isLoading={list.isLoading}
                shows={shows}
                totals={list.data?.totals}
                actions={actions}
                highlightId={linkedRow?.id}
              />
            )}
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              limitOptions={limitOptions}
              unit="phiếu"
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </main>
        </div>
      )}
      {form}
      {actions.elements}
    </>
  );
}

export default function TamUngPage() {
  return (
    <FinancePageGuard
      permissions={[{ resource: "cash_advance", action: "view" }]}>
      <CashAdvanceScreen />
    </FinancePageGuard>
  );
}
