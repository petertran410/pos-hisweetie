"use client";

import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Send, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import {
  FilterDivider,
  FilterSection,
  FinanceFilterSidebar,
} from "@/components/internal-finance/FinanceFilterSidebar";
import { TimeRangeFilter } from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import {
  loadSavedDates,
  useSavedTimeRange,
  type DateRange,
} from "@/lib/internal-finance/time-range";
import { InternalFinanceWeeklyPanel } from "@/components/internal-finance/InternalFinanceWeeklyPanel";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateWarehouseExpenseApproval,
  useWarehouseExpenseBatchPage,
} from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  useFollowHeaderBranch,
  useHeaderBranchId,
} from "@/lib/internal-finance/header-branch";
import {
  readSavedFilters,
  restoreBranchIds,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";
import type {
  InternalFinanceQuery,
  WeeklyBatch,
} from "@/lib/api/internal-finance";
import { CancelWeeklyBatchDialog } from "@/components/internal-finance/CancelWeeklyBatchDialog";
import { canCancelBatch } from "@/lib/internal-finance/weekly-batch";
import { formatCurrency } from "@/lib/utils";
import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { isoWeekRange } from "@/lib/internal-finance/dates";

const BRANCH_IDS = [6, 1];
const APPROVAL_COLUMNS = [
  { key: "code", label: "Mã" },
  { key: "branch", label: "Chi nhánh" },
  { key: "range", label: "Khoảng tuần" },
  { key: "total", label: "Tổng tiền" },
  { key: "count", label: "Số khoản" },
  { key: "issued", label: "Đã chi" },
  { key: "status", label: "Trạng thái" },
];
const STORAGE_KEY = "approval-week-sidebar-filters";

type SavedApprovalFilters = {
  branchIds?: number[];
  year?: string;
  week?: string;
  status?: string;
};

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
  STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => [
    value,
    label,
  ]),
);

function asBranches(payload: unknown) {
  if (Array.isArray(payload))
    return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

// Mốc tuần là ngày giờ đầy đủ, cắt theo giờ Việt Nam nên hiển thị theo giờ đó.
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
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
  const [cancelling, setCancelling] = useState<WeeklyBatch | null>(null);
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter(
        (branch) => BRANCH_IDS.includes(branch.id) && can("view", branch.id),
      ),
    [branchData, can],
  );
  const { columns, toggleColumn, shows, visibleCount } = useColumnToggle(
    "approvalWeekTableColumns",
    APPROVAL_COLUMNS,
  );
  const currentYear = new Date().getFullYear();
  const headerBranchId = useHeaderBranchId(BRANCH_IDS, (id) => can("view", id));
  const [saved] = useState(() =>
    readSavedFilters<SavedApprovalFilters>(STORAGE_KEY),
  );
  const [branchId, setBranchId] = useState<number | undefined>(
    () => restoreBranchIds(saved?.branchIds, headerBranchId, BRANCH_IDS)[0],
  );
  useFollowHeaderBranch(headerBranchId, branchId ? [branchId] : [], (id) =>
    setBranchId(id || undefined),
  );
  const [year, setYear] = useState(saved?.year || String(currentYear));
  const [week, setWeek] = useState(saved?.week || "");
  const [dates, setDates] = useState<DateRange>(() =>
    loadSavedDates(STORAGE_KEY),
  );
  const time = useSavedTimeRange(STORAGE_KEY, setDates);
  const fromDate = dates.fromDate || "";
  const toDate = dates.toDate || "";
  const [status, setStatus] = useState(saved?.status || "");
  useEffect(() => {
    writeSavedFilters(STORAGE_KEY, {
      branchIds: branchId ? [branchId] : [],
      // Năm hiện tại không lưu để sang năm mới trang tự theo năm mới.
      year: year === String(currentYear) ? "" : year,
      week,
      status,
    });
  }, [branchId, currentYear, status, week, year]);
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
    };
  }, [branchId, can, fromDate, status, toDate, week, year]);

  const [page, setPage] = useState(1);
  const [limit, setLimit, limitOptions] = usePageSize(
    "approvalWeekPageSize",
    20,
  );
  // Đổi bộ lọc thì về trang 1.
  const filterKey = JSON.stringify(filters);
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  if (filterKey !== seenFilterKey) {
    setSeenFilterKey(filterKey);
    setPage(1);
  }
  const batches = useWarehouseExpenseBatchPage({ ...filters, page, limit });
  const rows = batches.data?.data || [];
  const total = batches.data?.total || 0;
  const totalAmount = batches.data?.totalAmount || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const clearTime = () => {
    time.reset();
    setDates({});
  };
  const clearAll = () => {
    setBranchId(headerBranchId || undefined);
    setYear(String(currentYear));
    setWeek("");
    setStatus("");
    clearTime();
  };
  const activeCount = [branchId, week, status, time.active].filter(
    Boolean,
  ).length;

  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_expense", action: "view" }]}>
      <div
        className="flex h-full min-h-0 overflow-hidden border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <FinanceFilterSidebar activeCount={activeCount} onClear={clearAll}>
          {!week && (
            <>
              <TimeRangeFilter
                label="Thời gian"
                value={time.range}
                onChange={time.change}
              />
              <FilterDivider />
            </>
          )}
          <FilterSection label="Chi nhánh">
            <FilterSearchableSelect
              options={branches.map((branch) => ({
                value: String(branch.id),
                label: branch.name,
              }))}
              value={branchId ? String(branchId) : ""}
              onChange={(value) =>
                setBranchId(value ? Number(value) : undefined)
              }
              placeholder="Tất cả chi nhánh"
              searchable={false}
            />
          </FilterSection>
          <FilterDivider />
          <FilterSection label="Năm">
            <FilterSearchableSelect
              options={[currentYear, currentYear - 1, currentYear - 2].map(
                (item) => ({ value: String(item), label: String(item) }),
              )}
              value={year}
              onChange={(value) => {
                setYear(value || String(currentYear));
                clearTime();
              }}
              searchable={false}
              allowDeselect={false}
              showClearOption={false}
            />
          </FilterSection>
          <FilterSection label="Tuần">
            <FilterSearchableSelect
              options={Array.from({ length: 53 }, (_, index) => ({
                value: String(index + 1),
                label: `Tuần ${index + 1}`,
              }))}
              value={week}
              onChange={(value) => {
                setWeek(value);
                clearTime();
              }}
              placeholder="Tất cả các tuần"
              searchPlaceholder="Tìm tuần..."
            />
          </FilterSection>
          <FilterDivider />
          <FilterSection label="Trạng thái Approval">
            <FilterSearchableSelect
              options={STATUS_OPTIONS.filter(([value]) => value).map(
                ([value, label]) => ({ value, label }),
              )}
              value={status}
              onChange={setStatus}
              placeholder="Tất cả trạng thái"
              searchable={false}
            />
          </FilterSection>
        </FinanceFilterSidebar>

        <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <WalletCards className="h-5 w-5 text-brand" />
              <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
                Approval tuần
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
              <ColumnToggle columns={columns} onToggle={toggleColumn} />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-4 border-b px-4 py-2 text-sm">
            <span className="text-gray-500">
              Số batch: <strong className="text-gray-900">{total}</strong>
            </span>
            <span className="text-gray-500">
              Tổng chi:{" "}
              <strong className="text-red-600">
                {formatCurrency(totalAmount)}
              </strong>
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-10 border-b bg-gray-50">
                <tr>
                  {[
                    ...APPROVAL_COLUMNS.filter((column) =>
                      shows(column.key),
                    ).map((column) => column.label),
                    // Cột thao tác tạo approval luôn hiện.
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
                    <td
                      colSpan={visibleCount + 1}
                      className="py-16 text-center text-sm text-gray-400">
                      Đang tải batch tuần...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleCount + 1}
                      className="py-16 text-center text-sm text-gray-400">
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
                      {shows("code") && (
                        <td className="px-4 py-3 font-medium text-brand">
                          {row.code}
                        </td>
                      )}
                      {shows("branch") && (
                        <td className="px-4 py-3 text-gray-800">
                          {row.branch?.name || "-"}
                        </td>
                      )}
                      {shows("range") && (
                        <td className="px-4 py-3 text-gray-800">
                          {dateLabel(row.weekStart)} - {dateLabel(row.weekEnd)}
                        </td>
                      )}
                      {shows("total") && (
                        <td className="px-4 py-3 font-semibold text-red-600">
                          {formatCurrency(row.totalAmount)}
                        </td>
                      )}
                      {shows("count") && (
                        <td className="px-4 py-3 text-gray-700">
                          {row._count?.entries || 0}
                        </td>
                      )}
                      {shows("issued") && (
                        <td className="px-4 py-3 text-gray-700">
                          {row.cashIssuedCount || 0}/{row._count?.entries || 0}
                        </td>
                      )}
                      {shows("status") && (
                        <td className="px-4 py-3">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                      )}
                      {shows("approval") && (
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {row.status === "READY" &&
                            can("submit", row.branchId) ? (
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
                                {APPROVAL_STATUS_LABELS[
                                  row.approvalRequest.status
                                ] || row.approvalRequest.status}
                                {row.approvalRequest.status === "PENDING" &&
                                  row.approvalRequest.currentNode &&
                                  ` · ${row.approvalRequest.currentNode}`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                            {can("prepare", row.branchId) &&
                              canCancelBatch(row) && (
                                <button
                                  type="button"
                                  onClick={() => setCancelling(row)}
                                  className="whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                                  Hủy
                                </button>
                              )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            limitOptions={limitOptions}
            unit="batch"
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </div>
      </div>
      {showPanel && (
        <InternalFinanceWeeklyPanel
          initialBatchId={selectedBatchId}
          onClose={() => setShowPanel(false)}
        />
      )}
      {cancelling && (
        <CancelWeeklyBatchDialog
          batch={cancelling}
          onClose={() => setCancelling(null)}
        />
      )}
    </FinancePageGuard>
  );
}
