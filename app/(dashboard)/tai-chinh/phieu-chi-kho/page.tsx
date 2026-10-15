"use client";

import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Plus, WalletCards } from "lucide-react";
import Swal from "sweetalert2";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import { WarehouseExpenseForm } from "@/components/warehouse-expense/WarehouseExpenseForm";
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
  useCancelWarehouseExpense,
  useCheckWarehouseExpense,
  useMarkWarehouseExpenseIssued,
  useWarehouseExpenses,
} from "@/lib/hooks/useInternalFinance";
import { isExpenseOpenForEdit } from "@/lib/internal-finance/vehicle-constants";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";

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
  const [openedCode, setOpenedCode] = useState("");
  const markIssued = useMarkWarehouseExpenseIssued();
  const check = useCheckWarehouseExpense();
  const cancel = useCancelWarehouseExpense();

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
            page,
            limit,
          },
    [codeParam, debouncedSearch, filters, limit, page],
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

  const canEditRow = (row: InternalFinanceEntry) =>
    row.sourceType === "MANUAL_EXPENSE" &&
    isExpenseOpenForEdit(row) &&
    canAction("update", row.branchId);

  const inApprovedBatch = (row: InternalFinanceEntry) =>
    row.status === "APPROVED" && row.weeklyBatch?.status === "APPROVED";

  const handleMarkIssued = async (row: InternalFinanceEntry) => {
    let reason: string | undefined;
    if (inApprovedBatch(row)) {
      const result = await Swal.fire({
        title: "Xác nhận đã chi?",
        text: "Xác nhận khoản chi và ghi vào quỹ nội bộ.",
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
        html: `<p class="text-sm text-gray-600">Phiếu này chưa nằm trong Approval tuần đã duyệt. Nhập lý do để ghi Đã chi và trừ quỹ nội bộ <strong>${formatCurrency(row.amount)}</strong>.</p>`,
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
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  if (event.target.value.trim() !== codeParam) clearCodeParam();
                }}
                placeholder="Tìm mã, nội dung, ghi chú, xe, mã báo đơn..."
                className="h-9 w-64 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
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
              <Link
                href="/tai-chinh/approval-tuan"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <CalendarRange className="h-4 w-4" />
                Approval tuần
              </Link>
              <ColumnToggle columns={columns} onToggle={toggleColumn} />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-4 border-b px-4 py-2 text-sm">
            <span className="text-gray-500">
              Số dòng: <strong className="text-gray-900">{total}</strong>
            </span>
            <span className="text-gray-500">
              Tổng tiền trang:{" "}
              <strong className="text-red-600">
                {formatCurrency(pageAmount)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                clearCodeParam();
              }}
              className="text-sm font-medium text-brand hover:underline">
              Xóa tìm kiếm
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                canCheck={(row, role) =>
                  isExpenseCheckOpen(row) &&
                  canAction(`check_${role}`, row.branchId)
                }
                canMarkIssued={(row) =>
                  canAction("mark_issued", row.branchId) &&
                  !row.cashIssued &&
                  (inApprovedBatch(row) || isExpenseCheckOpen(row))
                }
                onCheck={(row, role, checked) =>
                  check.mutate({ id: row.id, role, checked })
                }
                canEdit={canEditRow}
                canCancel={(row) =>
                  isExpenseCancellable(row) && canAction("cancel", row.branchId)
                }
                busyId={markingId}
                highlightId={linkedRow?.id}
                onOpenAttachments={setAttachmentRow}
                onEdit={setEditingExpense}
                onMarkIssued={handleMarkIssued}
                onCancel={handleCancel}
                onOpenNotes={setNotesRow}
                shows={shows}
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

      {showForm && (
        <WarehouseExpenseForm
          branchId={branchId}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingExpense && (
        <WarehouseExpenseForm
          branchId={editingExpense.branchId}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
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
