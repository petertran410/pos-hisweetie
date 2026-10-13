"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Send, WalletCards } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { InternalFinanceWeeklyPanel } from "@/components/internal-finance/InternalFinanceWeeklyPanel";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateWarehouseExpenseApproval,
  useWarehouseExpenseBatches,
} from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import type { InternalFinanceQuery } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";
import { isoWeekRange } from "@/lib/internal-finance/dates";

const BRANCH_IDS = [6, 1];

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELED: "Đã hủy",
  DELETED: "Đã xóa",
  REVERTED: "Đã thu hồi",
  CREATE_FAILED: "Tạo thất bại",
};
const STATUS_OPTIONS = [
  ["", "Tất cả trạng thái"],
  ["DRAFT", "Bản nháp"],
  ["READY", "Sẵn sàng tạo Approval"],
  ["IN_APPROVAL", "Đang duyệt"],
  ["APPROVED", "Đã duyệt"],
  ["REJECTED", "Từ chối"],
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => [value, label]),
);

function asBranches(payload: unknown) {
  if (Array.isArray(payload)) return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN");
}

export default function ApprovalTuanPage() {
  const searchParams = useSearchParams();
  const access = useFinanceAccess();
  const can = useCallback(
    (action: string, id: number) => access.can("warehouse_expense", action, id),
    [access],
  );
  const canPrepareAny = BRANCH_IDS.some((id) => can("prepare", id));
  const createApproval = useCreateWarehouseExpenseApproval();
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter(
        (branch) => BRANCH_IDS.includes(branch.id) && can("view", branch.id),
      ),
    [branchData, can],
  );
  const currentYear = new Date().getFullYear();
  const [branchId, setBranchId] = useState<number | undefined>();
  const [year, setYear] = useState(String(currentYear));
  const [week, setWeek] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const initialBatchId = Number(searchParams.get("batchId")) || null;
  const [showPanel, setShowPanel] = useState(initialBatchId != null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(
    initialBatchId,
  );

  const filters = useMemo<InternalFinanceQuery>(() => {
    const weekRange = week
      ? isoWeekRange(Number(year), Number(week))
      : undefined;
    const yearRange = {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
    return {
      branchIds: branchId
        ? [branchId]
        : BRANCH_IDS.filter((id) => can("view", id)),
      fromDate: weekRange?.from || fromDate || yearRange.from,
      toDate: weekRange?.to || toDate || yearRange.to,
      status: status || undefined,
      limit: 100,
    };
  }, [branchId, can, fromDate, status, toDate, week, year]);

  const batches = useWarehouseExpenseBatches(filters);
  const rows = batches.data || [];
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);

  const clearDates = () => {
    setWeek("");
    setFromDate("");
    setToDate("");
  };

  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_expense", action: "view" }]}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden border-t">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <WalletCards className="h-5 w-5 text-brand" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Approval tuần
              </h1>
              <p className="text-xs text-gray-500">
                Gom phiếu chi kho đã đủ hai tick theo tuần và tạo approval trên Lark.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tai-chinh/phieu-chi-kho"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Phiếu chi kho
            </Link>
            {canPrepareAny && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchId(null);
                  setShowPanel(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                <Plus className="h-4 w-4" />
                Tổng hợp tuần
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 overflow-y-auto border-r bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Bộ lọc</h2>
              {(branchId || week || fromDate || toDate || status) && (
                <button
                  type="button"
                  onClick={() => {
                    setBranchId(undefined);
                    setYear(String(currentYear));
                    setStatus("");
                    clearDates();
                  }}
                  className="text-xs font-medium text-brand hover:underline">
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Chi nhánh
                <select
                  value={branchId || ""}
                  onChange={(event) =>
                    setBranchId(event.target.value ? Number(event.target.value) : undefined)
                  }
                  className="dt-select rounded-lg">
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Năm
                <select
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    setFromDate("");
                    setToDate("");
                  }}
                  className="dt-select rounded-lg">
                  {[currentYear, currentYear - 1, currentYear - 2].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Tuần
                <select
                  value={week}
                  onChange={(event) => {
                    setWeek(event.target.value);
                    setFromDate("");
                    setToDate("");
                  }}
                  className="dt-select rounded-lg">
                  <option value="">Tất cả các tuần</option>
                  {Array.from({ length: 53 }, (_, index) => index + 1).map((item) => (
                    <option key={item} value={item}>
                      Tuần {item}
                    </option>
                  ))}
                </select>
              </label>

              {!week && (
                <>
                  <InternalFinanceDateField
                    label="Từ ngày"
                    value={fromDate}
                    onChange={(value) => value && setFromDate(value)}
                  />
                  <InternalFinanceDateField
                    label="Đến ngày"
                    value={toDate}
                    onChange={(value) => value && setToDate(value)}
                  />
                </>
              )}

              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Trạng thái Approval
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="dt-select rounded-lg">
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-6 text-sm">
              <span className="text-gray-500">
                Số batch: <strong className="text-gray-900">{rows.length}</strong>
              </span>
              <span className="text-gray-500">
                Tổng chi:{" "}
                <strong className="text-red-600">{formatCurrency(totalAmount)}</strong>
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {[
                      "Mã batch",
                      "Chi nhánh",
                      "Khoảng tuần",
                      "Tổng tiền",
                      "Số khoản",
                      "Đã chi",
                      "Trạng thái",
                      "Approval Lark",
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                        Đang tải batch tuần...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                        Không có batch phù hợp
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedBatchId(row.id);
                          setShowPanel(true);
                        }}
                        className="cursor-pointer hover:bg-brand-soft">
                        <td className="px-4 py-3 font-medium text-brand">{row.code}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {row.branch?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {dateLabel(row.weekStart)} - {dateLabel(row.weekEnd)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-600">
                          {formatCurrency(row.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row._count?.entries || 0}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.cashIssuedCount || 0}/{row._count?.entries || 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}>
                          {row.status === "READY" && can("submit", row.branchId) ? (
                            <button
                              type="button"
                              disabled={createApproval.isPending}
                              onClick={() => {
                                setCreatingId(row.id);
                                createApproval.mutate(
                                  { id: row.id },
                                  { onSettled: () => setCreatingId(null) },
                                );
                              }}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                              {creatingId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Tạo approval
                            </button>
                          ) : row.approvalRequest ? (
                            <span className="text-xs text-gray-600">
                              {APPROVAL_STATUS_LABELS[row.approvalRequest.status] ||
                                row.approvalRequest.status}
                              {row.approvalRequest.status === "PENDING" &&
                                row.approvalRequest.currentNode &&
                                ` · ${row.approvalRequest.currentNode}`}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
      {showPanel && (
        <InternalFinanceWeeklyPanel
          initialBatchId={selectedBatchId}
          onClose={() => setShowPanel(false)}
        />
      )}
    </FinancePageGuard>
  );
}
