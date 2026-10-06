"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  WalletCards,
} from "lucide-react";
import Swal from "sweetalert2";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import { WarehouseExpenseApprovalModal } from "@/components/warehouse-expense/WarehouseExpenseApprovalModal";
import { WarehouseExpenseForm } from "@/components/warehouse-expense/WarehouseExpenseForm";
import { WarehouseExpenseTable } from "@/components/warehouse-expense/WarehouseExpenseTable";
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
  useMarkWarehouseExpenseIssued,
  useWarehouseExpenses,
} from "@/lib/hooks/useInternalFinance";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";

const PAGE_SIZE = 50;

const scopeForBranch = (branchId: number) =>
  branchId === 6 ? "hn" : branchId === 1 ? "sg" : "vp";

function WarehouseExpenseScreen() {
  const { user } = useAuthStore();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const [filters, setFilters] = useState<WarehouseExpenseSidebarFilters>(() =>
    loadWarehouseExpenseFilters(selectedBranch?.id),
  );
  const branchId = filters.branchId || selectedBranch?.id || 6;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<InternalFinanceEntry | null>(null);
  const [showApproval, setShowApproval] = useState(false);
  const [attachmentRow, setAttachmentRow] =
    useState<InternalFinanceEntry | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const markIssued = useMarkWarehouseExpenseIssued();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const canAction = (action: string, targetBranchId = branchId) => {
    if (user?.roles?.includes("Super Admin")) return true;
    const fundAction = action === "create" ? "create_expense" : action === "update" ? "adjust" :
      action === "prepare" || action === "submit" ? "submit_approval" : action;
    return Boolean(
      user?.permissions?.includes(
        `warehouse_expense:${action}_${scopeForBranch(targetBranchId)}`,
      ) || user?.permissions?.includes(`internal_fund:${fundAction}_${scopeForBranch(targetBranchId)}`),
    );
  };

  const query = useMemo<WarehouseExpenseQuery>(
    () => ({
      branchId: filters.branchId,
      category: filters.category,
      status: filters.status,
      cashIssued: filters.cashIssued,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [
      debouncedSearch,
      filters,
      page,
    ],
  );
  const expenses = useWarehouseExpenses(query);
  const rows = expenses.data?.data || [];
  const total = expenses.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const handleFiltersChange = (
    patch: Partial<WarehouseExpenseSidebarFilters>,
  ) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const handleMarkIssued = async (row: InternalFinanceEntry) => {
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
    setMarkingId(row.id);
    markIssued.mutate(
      { id: row.id, cashIssued: true },
      { onSettled: () => setMarkingId(null) },
    );
  };

  return (
    <PagePermissionGuard
      permissions={[
        { resource: "warehouse_expense", action: "view_hn" },
        { resource: "warehouse_expense", action: "view_sg" },
        { resource: "warehouse_expense", action: "view_vp" },
        { resource: "internal_fund", action: "view_hn" },
        { resource: "internal_fund", action: "view_sg" },
        { resource: "internal_fund", action: "view_vp" },
      ]}>
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
              }}
              placeholder="Tìm mã khoản chi, nội dung, mã báo đơn..."
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
              {canAction("prepare") && (
                <button
                  type="button"
                  onClick={() => setShowApproval(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                  <Send className="h-4 w-4" />
                  Tổng hợp tuần
                </button>
              )}
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
                onClick={() => setSearch("")}
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
              isLoading={expenses.isLoading || expenses.isFetching}
              canMarkIssued={(row) =>
                canAction("mark_issued", row.branchId) &&
                row.status === "APPROVED" &&
                row.weeklyBatch?.status === "APPROVED" &&
                !row.cashIssued
              }
              canEdit={(row) => canAction("update", row.branchId)}
              markingId={markingId}
              onOpenAttachments={setAttachmentRow}
              onEdit={setEditingExpense}
              onMarkIssued={handleMarkIssued}
            />
          )}
          <div className="flex shrink-0 items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-gray-500">
              Trang {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Trang trước"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Trang sau"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        </main>
      </div>

      {showForm && (
        <WarehouseExpenseForm branchId={branchId} onClose={() => setShowForm(false)} />
      )}
      {editingExpense && (
        <WarehouseExpenseForm
          branchId={editingExpense.branchId}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
      {showApproval && (
        <WarehouseExpenseApprovalModal
          branchId={branchId}
          canPrepare={canAction("prepare")}
          canSubmit={canAction("submit")}
          onClose={() => setShowApproval(false)}
        />
      )}
      {attachmentRow && (
        <WarehouseCashAttachmentsModal
          attachments={attachmentRow.attachments || []}
          title={attachmentRow.description || attachmentRow.code}
          onClose={() => setAttachmentRow(null)}
        />
      )}
    </PagePermissionGuard>
  );
}

export default function PhieuChiKhoPage() {
  return <WarehouseExpenseScreen />;
}
