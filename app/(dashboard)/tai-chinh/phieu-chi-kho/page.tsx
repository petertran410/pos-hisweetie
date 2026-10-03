"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Send,
  WalletCards,
} from "lucide-react";
import Swal from "sweetalert2";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import { WarehouseExpenseApprovalModal } from "@/components/warehouse-expense/WarehouseExpenseApprovalModal";
import { WarehouseExpenseForm } from "@/components/warehouse-expense/WarehouseExpenseForm";
import { WarehouseExpenseTable } from "@/components/warehouse-expense/WarehouseExpenseTable";
import type {
  InternalFinanceEntry,
  WarehouseExpenseQuery,
} from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
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

function asBranches(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as Array<{
      id: number;
      name: string;
      isActive?: boolean;
    }>;
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (
      payload as {
        data: Array<{ id: number; name: string; isActive?: boolean }>;
      }
    ).data;
  }
  return [];
}

function WarehouseExpenseScreen() {
  const { user } = useAuthStore();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter((branch) => {
        if (![1, 4, 6, 7].includes(branch.id)) return false;
        if (branch.isActive === false) return false;
        if (user?.roles?.includes("Super Admin")) return true;
        return user?.permissions?.includes(
          `warehouse_expense:view_${scopeForBranch(branch.id)}`,
        );
      }),
    [branchData, user],
  );
  const branchId =
    branches.find((branch) => branch.id === selectedBranch?.id)?.id ||
    branches[0]?.id ||
    6;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [cashIssued, setCashIssued] = useState<"ISSUED" | "NOT_ISSUED" | "">(
    "",
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
    return Boolean(
      user?.permissions?.includes(
        `warehouse_expense:${action}_${scopeForBranch(targetBranchId)}`,
      ),
    );
  };

  const query = useMemo<WarehouseExpenseQuery>(
    () => ({
      branchId,
      category: category || undefined,
      status: status || undefined,
      cashIssued: cashIssued || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [
      branchId,
      cashIssued,
      category,
      debouncedSearch,
      fromDate,
      page,
      status,
      toDate,
    ],
  );
  const expenses = useWarehouseExpenses(query);
  const rows = expenses.data?.data || [];
  const total = expenses.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setCashIssued("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleBranchChange = (nextBranchId: number) => {
    const nextBranch = branches.find((branch) => branch.id === nextBranchId);
    if (nextBranch) {
      setSelectedBranch({
        ...nextBranch,
        isActive: nextBranch.isActive !== false,
      });
    }
    setPage(1);
  };

  const handleMarkIssued = async (row: InternalFinanceEntry) => {
    const result = await Swal.fire({
      title: "Xác nhận đã chi?",
      text: "Hệ thống sẽ tạo giao dịch chi tiền mặt trong sổ quỹ kho.",
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
      ]}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden border-t bg-gray-50">
        <div className="shrink-0 border-b bg-white px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-brand" />
              <div>
                <h1 className="text-base font-semibold text-gray-900">
                  Phiếu chi kho
                </h1>
                <p className="text-xs text-gray-500">
                  Tổng hợp chi phí theo tuần, gửi Lark và xác nhận chi tiền mặt.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <div className="shrink-0 border-b bg-white px-5 py-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Chi nhánh
              <select
                value={branchId}
                onChange={(event) =>
                  handleBranchChange(Number(event.target.value))
                }
                className="dt-select h-10 w-full">
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Khoản mục
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="dt-select h-10 w-full">
                <option value="">Tất cả khoản mục</option>
                <option value="DELIVERY_FEE">Chi phí giao hàng</option>
                <option value="FUEL">Xăng dầu</option>
                <option value="VEHICLE_CARE">Chăm sóc xe</option>
                <option value="OTHER_EXPENSE">Chi phí khác</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Trạng thái
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="dt-select h-10 w-full">
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING_ACCOUNTANT">Chờ kế toán</option>
                <option value="READY_FOR_WEEKLY_APPROVAL">Sẵn sàng tổng hợp</option>
                <option value="IN_WEEKLY_APPROVAL">Đang duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="POSTED">Đã ghi sổ</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Tiền chi
              <select
                value={cashIssued}
                onChange={(event) => {
                  setCashIssued(
                    event.target.value as "ISSUED" | "NOT_ISSUED" | "",
                  );
                  setPage(1);
                }}
                className="dt-select h-10 w-full">
                <option value="">Tất cả</option>
                <option value="NOT_ISSUED">Chưa chi</option>
                <option value="ISSUED">Đã chi</option>
              </select>
            </label>
            <InternalFinanceDateField
              label="Từ ngày"
              value={fromDate}
              onChange={(value) => {
                setFromDate(value || "");
                setPage(1);
              }}
            />
            <InternalFinanceDateField
              label="Đến ngày"
              value={toDate}
              onChange={(value) => {
                setToDate(value || "");
                setPage(1);
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã khoản chi, nội dung, mã báo đơn..."
                className="dt-input h-10 w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-4 text-sm">
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
                onClick={resetFilters}
                className="text-sm font-medium text-brand hover:underline">
                Xóa lọc
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl border-x border-b bg-white">
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
