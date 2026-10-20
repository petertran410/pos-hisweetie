"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HandCoins, Plus, Undo2, X } from "lucide-react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { MobileFilterDrawer } from "@/components/internal-finance/mobile/FinanceMobileShell";
import { TablePagination } from "@/components/shared/TablePagination";
import { CashAdvanceRefundForm } from "@/components/cash-advances/CashAdvanceRefundForm";
import {
  CashAdvanceSidebar,
  loadCashAdvanceFilters,
  type CashAdvanceSidebarFilters,
} from "@/components/cash-advances/CashAdvanceSidebar";
import {
  CashAdvanceRefundMobileList,
  CashAdvanceRefundTable,
  useRefundActions,
} from "@/components/cash-advances/CashAdvanceRefundViews";
import type { CashAdvanceRefundQuery } from "@/lib/api/cash-advances";
import { useCashAdvanceRefunds } from "@/lib/hooks/useCashAdvances";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { CASH_ADVANCE_BRANCH_IDS } from "@/lib/cash-advances/display";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useBranchStore } from "@/lib/store/branch";

const STORAGE_KEY = "cash-advance-refund-sidebar-filters";

function RefundScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code")?.trim() || "";
  // Nút "Tạo hoàn ứng" ở trang Tạm ứng: ?advanceId=<id> mở sẵn form.
  const advanceParam = Number(searchParams.get("advanceId")) || undefined;
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
    "cashAdvanceRefundPageSize",
    30,
    [10, 20, 30, 50, 100],
  );
  const [formAdvanceId, setFormAdvanceId] = useState<number | null>(
    advanceParam ?? null,
  );
  const [showForm, setShowForm] = useState(Boolean(advanceParam));
  const [showFilters, setShowFilters] = useState(false);
  const actions = useRefundActions();
  const canCreate =
    access.branches("cash_advance_refund", "create", CASH_ADVANCE_BRANCH_IDS)
      .length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const replaceParams = (drop: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    drop.forEach((key) => params.delete(key));
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

  const query = useMemo<CashAdvanceRefundQuery>(
    () =>
      codeParam && debouncedSearch === codeParam
        ? { search: codeParam, page: 1, limit }
        : {
            branchId: filters.branchId,
            status: filters.status,
            refunderId: filters.personId,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            search: debouncedSearch || undefined,
            page,
            limit,
          },
    [codeParam, debouncedSearch, filters, limit, page],
  );
  const list = useCashAdvanceRefunds(query);
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
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;

  const openCreate = () => {
    setFormAdvanceId(null);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    if (advanceParam) replaceParams(["advanceId"]);
  };

  const sidebar = (
    <CashAdvanceSidebar
      resource="cash_advance_refund"
      storageKey={STORAGE_KEY}
      filters={filters}
      onChange={handleFiltersChange}
      personLabel="Người hoàn ứng"
      timeLabel="Ngày hoàn ứng"
    />
  );
  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (codeParam && value.trim() !== codeParam) replaceParams(["Code"]);
  };

  return (
    <>
      {isMobile ? (
        <div className="flex h-full min-h-0 flex-col border-t">
          <MobileFilterDrawer
            open={showFilters}
            onClose={() => setShowFilters(false)}>
            {sidebar}
          </MobileFilterDrawer>
          <CashAdvanceRefundMobileList
            rows={rows}
            isLoading={list.isLoading}
            search={search}
            onSearchChange={onSearchChange}
            activeFilterCount={activeFilterCount}
            onOpenFilter={() => setShowFilters(true)}
            total={list.data?.totals?.amount}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onCreate={canCreate ? openCreate : undefined}
            actions={actions}
          />
        </div>
      ) : (
        <div className="flex h-full min-h-0 overflow-hidden border-t bg-gray-50">
          {sidebar}
          <main className="m-4 ml-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-5 w-5 text-brand" />
                  <h1 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Hoàn ứng
                  </h1>
                </div>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Tìm mã, mã tạm ứng, người hoàn ứng..."
                    className="h-9 w-72 rounded-lg border px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {search && (
                    <button
                      type="button"
                      title="Xóa tìm kiếm"
                      onClick={() => onSearchChange("")}
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
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    <Plus className="h-4 w-4" />
                    Tạo hoàn ứng
                  </button>
                )}
                <Link
                  href="/tai-chinh/tam-ung"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <HandCoins className="h-4 w-4" />
                  Tạm ứng
                </Link>
              </div>
            </div>
            {list.isError ? (
              <div className="flex flex-1 items-center justify-center text-sm text-red-600">
                {list.error instanceof Error
                  ? list.error.message
                  : "Không tải được dữ liệu"}
              </div>
            ) : (
              <CashAdvanceRefundTable
                rows={rows}
                isLoading={list.isLoading}
                total={list.data?.totals?.amount}
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
      {showForm && (
        <CashAdvanceRefundForm
          initialAdvanceId={formAdvanceId ?? advanceParam}
          onClose={closeForm}
          // Tạo xong in phiếu hoàn ứng ngay.
          onCreated={(row) => actions.print(row)}
        />
      )}
      {actions.elements}
    </>
  );
}

export default function HoanUngPage() {
  return (
    <FinancePageGuard
      permissions={[{ resource: "cash_advance_refund", action: "view" }]}>
      <RefundScreen />
    </FinancePageGuard>
  );
}
