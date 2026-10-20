"use client";

import { PayerSummaryModal } from "@/components/warehouse-expense/PayerSummaryModal";
import { useBranches } from "@/lib/hooks/useBranches";
import { toast } from "sonner";
import { BulkCheckBar } from "@/components/warehouse-expense/BulkCheckBar";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MobileFilterDrawer } from "@/components/internal-finance/mobile/FinanceMobileShell";
import { WarehouseExpenseMobileList } from "@/components/warehouse-expense/WarehouseExpenseMobileList";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Download,
  Loader2,
  Plus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import { WarehouseExpenseForm } from "@/components/warehouse-expense/WarehouseExpenseForm";
import { ExpenseEvidenceModal } from "@/components/warehouse-expense/ExpenseEvidenceModal";
import { expenseSourceAction } from "@/lib/internal-finance/expense-source";
import { WarehouseExpenseNotesPanel } from "@/components/warehouse-expense/WarehouseExpenseNotesPanel";
import {
  isExpenseCancellable,
  isExpenseCheckOpen,
  WarehouseExpenseTable,
  WAREHOUSE_EXPENSE_COLUMNS,
} from "@/components/warehouse-expense/WarehouseExpenseTable";
import {
  loadWarehouseExpenseFilters,
  WarehouseExpenseSidebar,
  type WarehouseExpenseSidebarFilters,
} from "@/components/warehouse-expense/WarehouseExpenseSidebar";
import type {
  InternalFinanceEntry,
  WarehouseExpenseQuery,
} from "@/lib/api/internal-finance";
import {
  useBulkCheckWarehouseExpenses,
  useCancelWarehouseExpense,
  useCheckWarehouseExpense,
  useExportWarehouseExpenses,
  useMarkWarehouseExpenseIssued,
  useWarehouseExpenses,
} from "@/lib/hooks/useInternalFinance";
import { isExpenseOpenForEdit } from "@/lib/internal-finance/vehicle-constants";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";
import { cashAdvancesApi } from "@/lib/api/cash-advances";

function WarehouseExpenseScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Link "Mở phiếu chi" trong tin Lark: ?Code=<mã phiếu>.
  const codeParam = searchParams.get("Code")?.trim() || "";
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const [filters, setFilters] = useState<WarehouseExpenseSidebarFilters>(() =>
    loadWarehouseExpenseFilters(selectedBranch?.id),
  );
  const branchId = filters.branchId || selectedBranch?.id || 6;
  const { columns, toggleColumn, shows } = useColumnToggle(
    "warehouseExpenseTableColumns",
    WAREHOUSE_EXPENSE_COLUMNS,
  );
  const [search, setSearch] = useState(codeParam);
  const [debouncedSearch, setDebouncedSearch] = useState(codeParam);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{
    key: "date" | "amount";
    dir: "asc" | "desc";
  } | null>(null);
  // Bấm lần 1 giảm dần, lần 2 tăng dần, lần 3 về mặc định (như bảng Hóa đơn).
  const handleSort = (key: "date" | "amount") => {
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "desc" }
        : current.dir === "desc"
          ? { key, dir: "asc" }
          : null,
    );
    setPage(1);
  };
  const [limit, setLimit, limitOptions] = usePageSize(
    "warehouseExpensePageSize",
  );
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<InternalFinanceEntry | null>(null);
  const [attachmentRow, setAttachmentRow] =
    useState<InternalFinanceEntry | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [notesRow, setNotesRow] = useState<InternalFinanceEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPayerSummary, setShowPayerSummary] = useState(false);
  const isMobile = useIsMobile(768);
  const [openedCode, setOpenedCode] = useState("");
  const markIssued = useMarkWarehouseExpenseIssued();
  const check = useCheckWarehouseExpense();
  const bulkCheck = useBulkCheckWarehouseExpenses();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const cancel = useCancelWarehouseExpense();
  const { exportFile, isExporting } = useExportWarehouseExpenses();

  // Link mới (đang ở trang mà bấm link khác): tìm theo mã mới ngay.
  const [seenCode, setSeenCode] = useState(codeParam);
  if (codeParam !== seenCode) {
    setSeenCode(codeParam);
    if (codeParam) {
      setSearch(codeParam);
      setDebouncedSearch(codeParam);
      setPage(1);
    }
  }

  const clearCodeParam = () => {
    if (!codeParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("Code");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const access = useFinanceAccess();
  const canAction = (action: string, targetBranchId = branchId) =>
    access.can("warehouse_expense", action, targetBranchId);

  const query = useMemo<WarehouseExpenseQuery>(
    () =>
      // Mở theo mã từ link: chỉ tìm đúng mã đó, bỏ qua bộ lọc đã lưu.
      codeParam && debouncedSearch === codeParam
        ? { search: codeParam, page: 1, limit }
        : {
            branchId: filters.branchId,
            category: filters.category,
            status: filters.status,
            cashIssued: filters.cashIssued,
            checkStatus: filters.checkStatus,
            payerId: filters.payerId,
            expenseItem: filters.expenseItem,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            search: debouncedSearch || undefined,
            ...(sort
              ? {
                  orderBy: sort.key === "amount" ? "amount" : "occurredAt",
                  orderDirection: sort.dir,
                }
              : {}),
            page,
            limit,
          },
    [codeParam, debouncedSearch, filters, limit, page, sort],
  );
  const expenses = useWarehouseExpenses(query);
  const rows = expenses.data?.data || [];
  const total = expenses.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageAmount = rows.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  );
  const linkedRow = codeParam
    ? rows.find((row) => row.code === codeParam)
    : undefined;

  // Mở panel ghi chú của phiếu trong link một lần khi dữ liệu về.
  if (linkedRow && openedCode !== codeParam) {
    setOpenedCode(codeParam);
    setNotesRow(linkedRow);
  }

  const handleCancel = async (row: InternalFinanceEntry) => {
    const result = await Swal.fire({
      title: "Hủy phiếu chi kho",
      html: `<p class="text-sm text-gray-600">Hủy phiếu <strong>${row.code}</strong> (${formatCurrency(row.amount)}). Phiếu đã hủy không được tổng hợp tuần và không ghi quỹ.</p>`,
      input: "textarea",
      inputPlaceholder: "Lý do hủy phiếu",
      inputAttributes: { maxlength: "500" },
      inputValidator: (value) =>
        value?.trim() ? undefined : "Cần nhập lý do hủy",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    cancel.mutate({ id: row.id, reason: String(result.value).trim() });
  };

  const handleFiltersChange = (
    patch: Partial<WarehouseExpenseSidebarFilters>,
  ) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const canCheckRow = (
    row: InternalFinanceEntry,
    role: "manager" | "accountant",
  ) => isExpenseCheckOpen(row) && canAction(`check_${role}`, row.branchId);
  const canMarkIssuedRow = (row: InternalFinanceEntry) =>
    canAction("mark_issued", row.branchId) &&
    !row.cashIssued &&
    (inApprovedBatch(row) || isExpenseCheckOpen(row));
  const canCancelRow = (row: InternalFinanceEntry) =>
    isExpenseCancellable(row) && canAction("cancel", row.branchId);
  // Tick hàng loạt: chọn phiếu còn tick được và user có quyền tick ở kho đó.
  const canCheckAny = (row: InternalFinanceEntry) =>
    canAction("check_manager", row.branchId) ||
    canAction("check_accountant", row.branchId);
  const selectBlockReason = (row: InternalFinanceEntry) => {
    if (!isExpenseCheckOpen(row))
      return "Phiếu đã chi, đã hủy hoặc đã gửi Approval tuần";
    if (!canCheckAny(row)) return "Không có quyền tick ở kho này";
    if (row.managerReviewedAt && row.accountantReviewedAt)
      return "Đã đủ hai tick";
    return null;
  };
  const showSelection = rows.some(canCheckAny);
  // Đổi trang / bộ lọc / tìm kiếm thì bỏ chọn.
  const selectionKey = JSON.stringify(query);
  const [seenSelectionKey, setSeenSelectionKey] = useState(selectionKey);
  if (selectionKey !== seenSelectionKey) {
    setSeenSelectionKey(selectionKey);
    if (selected.size) setSelected(new Set());
  }
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const toggleSelected = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const handleBulkTick = async (role: "manager" | "accountant") => {
    const label = role === "manager" ? "Quản lý kho" : "Kế toán kho";
    const ids = selectedRows.map((row) => row.id);
    const amount = selectedRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );
    const confirm = await Swal.fire({
      title: `Tick ${label} cho ${ids.length} phiếu?`,
      html: `<p class="text-sm text-gray-600">Tổng tiền <strong>${formatCurrency(amount)}</strong>. Phiếu đã tick ${label} sẵn được giữ nguyên.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Tick ${label}`,
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "#0f766e",
    });
    if (!confirm.isConfirmed) return;
    bulkCheck.mutate(
      { ids, role },
      {
        onSuccess: (result) => {
          setSelected(new Set());
          setSelectMode(false);
          const done = result.updated.length;
          if (!result.skipped.length) {
            toast.success(
              `Đã tick ${label} ${done} phiếu` +
                (result.alreadyChecked
                  ? `, ${result.alreadyChecked} phiếu đã tick sẵn`
                  : ""),
            );
            return;
          }
          void Swal.fire({
            title: `Đã tick ${done}/${ids.length} phiếu`,
            icon: "warning",
            html: `<p class="mb-2 text-sm text-gray-600">Các phiếu sau không tick được:</p><ul class="max-h-60 overflow-auto text-left text-sm">${result.skipped
              .map(
                (item) =>
                  `<li class="py-0.5"><strong>${item.code}</strong>: ${item.reason}</li>`,
              )
              .join("")}</ul>`,
            confirmButtonText: "Đóng",
          });
        },
      },
    );
  };
  const bulkBar = selected.size ? (
    <BulkCheckBar
      count={selectedRows.length}
      amount={selectedRows.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0,
      )}
      canManager={selectedRows.some((row) =>
        canAction("check_manager", row.branchId),
      )}
      canAccountant={selectedRows.some((row) =>
        canAction("check_accountant", row.branchId),
      )}
      pending={bulkCheck.isPending}
      onTick={(role) => void handleBulkTick(role)}
      onClear={() => setSelected(new Set())}
      floating={isMobile}
    />
  ) : null;

  // Báo cáo theo người chi: cùng bộ lọc với danh sách, bỏ trang và sắp xếp.
  const payerSummaryQuery = useMemo<WarehouseExpenseQuery>(() => {
    const rest = { ...query };
    delete rest.page;
    delete rest.limit;
    delete rest.orderBy;
    delete rest.orderDirection;
    return rest;
  }, [query]);
  const { data: branchList } = useBranches();
  const payerScopeLabel = useMemo(() => {
    const payload = branchList as unknown;
    const list: Array<{ id: number; name: string }> = Array.isArray(payload)
      ? payload
      : ((payload as { data?: Array<{ id: number; name: string }> } | null)
          ?.data ?? []);
    const day = (value?: string) =>
      value ? value.split("-").reverse().join("/") : "";
    const parts = [
      filters.branchId
        ? list.find((branch) => branch.id === filters.branchId)?.name
        : "Tất cả chi nhánh",
      filters.fromDate || filters.toDate
        ? `${day(filters.fromDate) || "…"} – ${day(filters.toDate) || "…"}`
        : "Toàn thời gian",
      debouncedSearch && `Tìm "${debouncedSearch}"`,
    ].filter(Boolean);
    return `${parts.join(" · ")} · theo bộ lọc đang chọn`;
  }, [branchList, debouncedSearch, filters]);

  const activeFilterCount = [
    filters.branchId,
    filters.category,
    filters.status,
    filters.cashIssued,
    filters.checkStatus,
    filters.payerId,
    filters.expenseItem,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;

  // Phiếu tay sửa cả phiếu; phiếu đồng bộ từ Lark chỉ sửa chứng từ.
  const canEditRow = (row: InternalFinanceEntry) =>
    ["edit", "evidence"].includes(expenseSourceAction(row).kind) &&
    isExpenseOpenForEdit(row) &&
    canAction("update", row.branchId);

  const inApprovedBatch = (row: InternalFinanceEntry) =>
    row.status === "APPROVED" && row.weeklyBatch?.status === "APPROVED";

  const handleMarkIssued = async (row: InternalFinanceEntry) => {
    let reason: string | undefined;
    // Phiếu nằm trong kỳ của tạm ứng đã giao tiền: phần đó chi từ tạm ứng,
    // không trừ quỹ lần hai.
    const coverage = await cashAdvancesApi.coverage(row.id).catch(() => null);
    const fundText = coverage?.covered
      ? `chi từ tạm ứng <strong>${coverage.parts
          .map((part) => part.code)
          .join(", ")}</strong> ${formatCurrency(coverage.covered)}${
          coverage.uncovered
            ? `, trừ quỹ nội bộ <strong>${formatCurrency(coverage.uncovered)}</strong>`
            : " (không trừ quỹ nội bộ)"
        }`
      : `trừ quỹ nội bộ <strong>${formatCurrency(row.amount)}</strong>`;
    if (inApprovedBatch(row)) {
      const result = await Swal.fire({
        title: "Xác nhận đã chi?",
        html: `<p class="text-sm text-gray-600">Xác nhận khoản chi: ${fundText}.</p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Xác nhận Đã chi",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#0f766e",
      });
      if (!result.isConfirmed) return;
    } else {
      // Phiếu chưa nằm trong Approval tuần đã duyệt: bắt buộc ghi lý do.
      const result = await Swal.fire({
        title: "Đánh dấu Đã chi ngoài Approval tuần",
        html: `<p class="text-sm text-gray-600">Phiếu này chưa nằm trong Approval tuần đã duyệt. Nhập lý do để ghi Đã chi: ${fundText}.</p>`,
        input: "textarea",
        inputPlaceholder: "Lý do đánh dấu Đã chi",
        inputValidator: (value) =>
          value?.trim() ? undefined : "Cần nhập lý do",
        showCancelButton: true,
        confirmButtonText: "Xác nhận Đã chi",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#0f766e",
      });
      if (!result.isConfirmed) return;
      reason = String(result.value).trim();
    }
    setMarkingId(row.id);
    markIssued.mutate(
      { id: row.id, cashIssued: true, reason },
      { onSettled: () => setMarkingId(null) },
    );
  };

  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_expense", action: "view" }]}>
      {isMobile ? (
        <div className="flex h-full min-h-0 flex-col border-t">
          <MobileFilterDrawer
            open={showFilters}
            onClose={() => setShowFilters(false)}>
            <WarehouseExpenseSidebar
              filters={filters}
              onChange={handleFiltersChange}
            />
          </MobileFilterDrawer>
          <WarehouseExpenseMobileList
            rows={rows}
            isLoading={expenses.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
              if (value.trim() !== codeParam) clearCodeParam();
            }}
            activeFilterCount={activeFilterCount}
            onOpenFilter={() => setShowFilters(true)}
            total={total}
            pageAmount={pageAmount}
            totals={expenses.data?.totals}
            onOpenPayerSummary={() => setShowPayerSummary(true)}
            onExport={() => void exportFile(query)}
            isExporting={isExporting}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onCreate={canAction("create") ? () => setShowForm(true) : undefined}
            canCheck={canCheckRow}
            canMarkIssued={canMarkIssuedRow}
            canEdit={canEditRow}
            canCancel={canCancelRow}
            busyId={markingId}
            highlightId={linkedRow?.id}
            onCheck={(row, role, checked) =>
              check.mutate({ id: row.id, role, checked })
            }
            onOpenAttachments={setAttachmentRow}
            onEdit={setEditingExpense}
            onMarkIssued={handleMarkIssued}
            onCancel={handleCancel}
            onOpenNotes={setNotesRow}
            selection={
              showSelection
                ? {
                    selected,
                    blockReason: selectBlockReason,
                    onToggle: toggleSelected,
                  }
                : undefined
            }
            selectMode={selectMode}
            onToggleSelectMode={
              showSelection
                ? () => {
                    setSelectMode((current) => !current);
                    setSelected(new Set());
                  }
                : undefined
            }
          />
          {bulkBar}
        </div>
      ) : (
        <div className="flex h-full min-h-0 overflow-hidden border-t bg-gray-50">
          <WarehouseExpenseSidebar
            filters={filters}
            onChange={handleFiltersChange}
          />
          <main className="m-4 mb-4 ml-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <WalletCards className="h-5 w-5 text-brand" />
                  <h1 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Phiếu chi kho
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
                    placeholder="Tìm mã, nội dung, ghi chú, xe, mã báo đơn..."
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
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canAction("create") && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Plus className="h-4 w-4" />
                    Tạo khoản chi khác
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPayerSummary(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Users className="h-4 w-4" />
                  Theo người chi
                </button>
                <button
                  type="button"
                  onClick={() => void exportFile(query)}
                  disabled={isExporting}
                  title="Xuất Excel toàn bộ phiếu theo bộ lọc đang chọn"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Xuất file
                </button>
                <Link
                  href="/tai-chinh/approval-tuan"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <CalendarRange className="h-4 w-4" />
                  Approval tuần
                </Link>
                <ColumnToggle columns={columns} onToggle={toggleColumn} />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {bulkBar}
              {expenses.isError ? (
                <div className="flex flex-1 items-center justify-center text-sm text-red-600">
                  {expenses.error instanceof Error
                    ? expenses.error.message
                    : "Không tải được dữ liệu"}
                </div>
              ) : (
                <WarehouseExpenseTable
                  rows={rows}
                  // Chỉ hiện "Đang tải" lần đầu; tải lại nền (sau tick, Đã chi…)
                  // giữ nguyên bảng, trang và vị trí cuộn.
                  isLoading={expenses.isLoading}
                  canCheck={canCheckRow}
                  canMarkIssued={canMarkIssuedRow}
                  onCheck={(row, role, checked) =>
                    check.mutate({ id: row.id, role, checked })
                  }
                  canEdit={canEditRow}
                  canCancel={canCancelRow}
                  busyId={markingId}
                  highlightId={linkedRow?.id}
                  onOpenAttachments={setAttachmentRow}
                  onEdit={setEditingExpense}
                  onMarkIssued={handleMarkIssued}
                  onCancel={handleCancel}
                  onOpenNotes={setNotesRow}
                  shows={shows}
                  sort={sort}
                  onSort={handleSort}
                  totals={expenses.data?.totals}
                  selection={
                    showSelection
                      ? {
                          selected,
                          blockReason: selectBlockReason,
                          onToggle: toggleSelected,
                          onToggleAll: (ids, checked) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              for (const id of ids)
                                if (checked) next.add(id);
                                else next.delete(id);
                              return next;
                            }),
                        }
                      : undefined
                  }
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
            </div>
          </main>
        </div>
      )}

      {showForm && (
        <WarehouseExpenseForm
          branchId={branchId}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingExpense &&
        (expenseSourceAction(editingExpense).kind === "evidence" ? (
          <ExpenseEvidenceModal
            expense={editingExpense}
            onClose={() => setEditingExpense(null)}
          />
        ) : (
          <WarehouseExpenseForm
            branchId={editingExpense.branchId}
            expense={editingExpense}
            onClose={() => setEditingExpense(null)}
          />
        ))}
      {showPayerSummary && (
        <PayerSummaryModal
          query={payerSummaryQuery}
          scopeLabel={payerScopeLabel}
          onClose={() => setShowPayerSummary(false)}
          onSelectPayer={(payerId) => {
            setShowPayerSummary(false);
            handleFiltersChange({ payerId });
          }}
        />
      )}
      {notesRow && (
        <WarehouseExpenseNotesPanel
          entry={notesRow}
          canWrite={canAction("request_review", notesRow.branchId)}
          canEdit={canEditRow(notesRow)}
          onEdit={(row) => {
            setNotesRow(null);
            setEditingExpense(row);
          }}
          onClose={() => setNotesRow(null)}
        />
      )}
      {attachmentRow && (
        <WarehouseCashAttachmentsModal
          attachments={attachmentRow.attachments || []}
          title={attachmentRow.description || attachmentRow.code}
          onClose={() => setAttachmentRow(null)}
        />
      )}
    </FinancePageGuard>
  );
}

export default function PhieuChiKhoPage() {
  return <WarehouseExpenseScreen />;
}
