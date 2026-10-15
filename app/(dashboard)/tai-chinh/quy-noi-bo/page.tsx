"use client";

import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  CardAction,
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  SquarePen,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { FundClosingTable } from "@/components/internal-fund/FundClosingTable";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useAdjustInternalFundTransaction,
  useCancelInternalFundTransaction,
  useInternalFundAccess,
  useInternalFundDailyClosings,
  useInternalFundTransactions,
  useInternalFundSummary,
} from "@/lib/hooks/useInternalFund";
import { useBranchStore } from "@/lib/store/branch";
import type {
  InternalFundQuery,
  InternalFundTransaction,
} from "@/lib/api/internal-fund";
import { formatCurrency } from "@/lib/utils";

type View = "transactions" | "closings";
const views: Array<[View, string]> = [
  ["transactions", "Sổ quỹ"],
  ["closings", "Chốt sổ"],
];
const labels: Record<string, string> = {
  RECEIPT: "Thu nội bộ",
  EXPENSE: "Chi",
  TRANSFER_IN: "Chuyển đến",
  TRANSFER_OUT: "Chuyển đi",
  POSTED: "Đã ghi quỹ",
  CANCELLED: "Đã hủy",
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CREATE_FAILED: "Tạo thất bại",
  MATCHED: "Khớp",
  MISMATCHED: "Lệch quỹ",
};
// Nguồn ghi quỹ không qua Approval của POS; hiển thị rõ để phân biệt với thu/chi nội bộ.
const sourceLabels: Record<string, string> = {
  WAREHOUSE_CASH_RECEIPT: "Thu tiền khách",
  LARK_PAYMENT_VOUCHER: "Phiếu chi theo đơn duyệt",
};
// Các nguồn này phải hủy tại màn hình gốc để hai bên không lệch nhau;
// bút toán lịch sử thì chỉ đọc.
const originOwnedSources = ["WAREHOUSE_CASH_RECEIPT", "LEDGER_HISTORY"];
// Tên hiển thị của loại giao dịch; chuyển quỹ lịch sử vẫn hiện "Chuyển đến/đi".
const typeLabel = (row: { sourceType: string; transactionType: string }) =>
  row.sourceType === "LEDGER_HISTORY"
    ? labels[row.transactionType]
    : sourceLabels[row.sourceType] || labels[row.transactionType];
const today = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const inputClass = "dt-input h-10 w-full";

const LEDGER_COLUMNS = [
  { key: "code", label: "Mã" },
  { key: "date", label: "Ngày" },
  { key: "type", label: "Loại" },
  { key: "content", label: "Nội dung" },
  { key: "amount", label: "Số tiền" },
  { key: "status", label: "Trạng thái" },
];
const STORAGE_KEY = "internal-fund-sidebar-filters";

function FundScreen() {
  const ledgerColumns = useColumnToggle(
    "fundLedgerTableColumns",
    LEDGER_COLUMNS,
  );
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const access = useInternalFundAccess();
  const branchQuery = useBranches();
  const params = useSearchParams();
  const allBranches = Array.isArray(branchQuery.data) ? branchQuery.data : [];
  const branches = allBranches.filter((branch) =>
    access.data?.[branch.id]?.includes("view"),
  );
  const branchId =
    branches.find((branch) => branch.id === selectedBranch?.id)?.id ||
    branches[0]?.id ||
    6;
  const can = (action: string, branch = branchId) =>
    Boolean(access.data?.[branch]?.includes(action));
  const isMobile = useIsMobile(768);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<View>(() =>
    views.some(([key]) => key === params.get("view"))
      ? (params.get("view") as View)
      : "transactions",
  );
  const [creatingClosing, setCreatingClosing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "POSTED" | "CANCELLED">("");
  const [dates, setDates] = useState<DateRange>(() =>
    loadSavedDates(STORAGE_KEY),
  );
  const fromDate = dates.fromDate || "";
  const toDate = dates.toDate || "";
  const [page, setPage] = useState(1);
  const [limit, setLimit, limitOptions] = usePageSize(
    "internalFundLedgerPageSize",
    30,
    [10, 15, 20, 30, 50, 100],
  );
  const [closingPage, setClosingPage] = useState(1);
  const resetPages = () => {
    setPage(1);
    setClosingPage(1);
  };
  const time = useSavedTimeRange(STORAGE_KEY, (next) => {
    setDates(next);
    resetPages();
  });
  const query: InternalFundQuery = {
    branchId,
    search: search || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit,
  };
  const ready = branches.length > 0;
  const transactions = useInternalFundTransactions(query, ready);
  const closings = useInternalFundDailyClosings(
    {
      branchId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: closingPage,
      limit: 30,
    },
    ready,
  );
  const cancelTransaction = useCancelInternalFundTransaction();
  const adjust = useAdjustInternalFundTransaction();
  const [action, setAction] = useState<{
    kind: "cancel" | "adjust";
    id: number;
    description?: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const rows = transactions.data?.data || [];
  const closingRows = closings.data?.data || [];
  const summary = useInternalFundSummary(
    {
      branchId,
      fromDate: today(),
    },
    ready,
  );
  const totalPages = Math.max(
    1,
    Math.ceil((transactions.data?.total || 0) / limit),
  );
  const closingTotalPages = Math.max(
    1,
    Math.ceil((closings.data?.total || 0) / 30),
  );
  const requestAction = (
    kind: "cancel" | "adjust",
    id: number,
    text?: string,
  ) => {
    setAction({ kind, id, description: text });
    setReason("");
    setDescription(text || "");
  };
  const submitAction = () => {
    if (!action || !reason.trim()) {
      toast.error("Cần lý do");
      return;
    }
    const success = { onSuccess: () => setAction(null) };
    // Dòng thuộc một lệnh chuyển tiền thì máy chủ tự hủy cả hai chiều.
    if (action.kind === "cancel")
      cancelTransaction.mutate({ id: action.id, reason }, success);
    else adjust.mutate({ id: action.id, description, reason }, success);
  };
  const activeError =
    view === "transactions" ? transactions.error : closings.error;
  const pending = cancelTransaction.isPending || adjust.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-t">
      <div
        role="tablist"
        className="flex shrink-0 gap-1 overflow-x-auto border-b bg-white px-4">
        {views.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            type="button"
            onClick={() => setView(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${view === key ? "border-brand font-semibold text-brand" : "border-transparent text-gray-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <div
        className={`flex min-h-0 flex-1 overflow-hidden ${
          isMobile ? "flex-col" : ""
        }`}>
        <FinanceFilterSidebar
          mobileOpen={showFilters}
          onMobileClose={isMobile ? () => setShowFilters(false) : undefined}
          activeCount={
            [time.active, view === "transactions" ? status : ""].filter(Boolean)
              .length
          }
          onClear={() => {
            time.reset();
            setDates({});
            setStatus("");
            resetPages();
          }}>
          <TimeRangeFilter
            label="Thời gian"
            value={time.range}
            onChange={time.change}
          />
          <FilterDivider />
          <FilterSection label="Chi nhánh">
            <FilterSearchableSelect
              options={branches.map((branch) => ({
                value: String(branch.id),
                label: branch.name,
              }))}
              value={String(branchId)}
              onChange={(value) => {
                const next = branches.find(
                  (branch) => branch.id === Number(value),
                );
                if (next) setSelectedBranch(next);
                resetPages();
              }}
              searchable={false}
              allowDeselect={false}
              showClearOption={false}
            />
          </FilterSection>
          {view === "transactions" && (
            <>
              <FilterDivider />
              <FilterSection label="Trạng thái">
                <FilterSearchableSelect
                  options={[{ value: "CANCELLED", label: "Đã hủy" }]}
                  value={status}
                  onChange={(value) => {
                    setStatus(value as typeof status);
                    resetPages();
                  }}
                  placeholder="Đã ghi quỹ"
                  searchable={false}
                />
              </FilterSection>
            </>
          )}
        </FinanceFilterSidebar>
        {isMobile ? (
          <FinanceMobileShell
            title="Quỹ nội bộ"
            search={view === "transactions" ? search : undefined}
            onSearchChange={
              view === "transactions"
                ? (value) => {
                    setSearch(value);
                    setPage(1);
                  }
                : undefined
            }
            searchPlaceholder="Tìm mã, nội dung..."
            activeFilterCount={
              [time.active, view === "transactions" ? status : ""].filter(
                Boolean,
              ).length
            }
            onOpenFilter={() => setShowFilters(true)}
            summary={
              summary.data?.[0] ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span>
                    Đầu kỳ{" "}
                    <strong>{formatCurrency(summary.data[0].opening)}</strong>
                  </span>
                  <span>
                    Cuối kỳ{" "}
                    <strong>{formatCurrency(summary.data[0].closing)}</strong>
                  </span>
                  <span>
                    Thu{" "}
                    <strong className="text-green-700">
                      {formatCurrency(summary.data[0].receipt)}
                    </strong>
                  </span>
                  <span>
                    Chi{" "}
                    <strong className="text-red-600">
                      {formatCurrency(summary.data[0].expense)}
                    </strong>
                  </span>
                </div>
              ) : undefined
            }
            // Danh sách tự hiện trạng thái tải / trống.
            isLoading={false}
            isEmpty={false}
            page={view === "transactions" ? page : closingPage}
            totalPages={
              view === "transactions" ? totalPages : closingTotalPages
            }
            onPageChange={view === "transactions" ? setPage : setClosingPage}
            onCreate={
              view === "closings" && can("close")
                ? () => setCreatingClosing(true)
                : undefined
            }>
            {activeError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {activeError instanceof Error
                  ? activeError.message
                  : "Không tải được dữ liệu"}
              </div>
            )}
            {view === "transactions" ? (
              transactions.isLoading ? (
                <div className="py-16 text-center text-gray-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </div>
              ) : !rows.length ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  Chưa có giao dịch
                </div>
              ) : (
                rows.map((row: InternalFundTransaction) => {
                  const out = ["EXPENSE", "TRANSFER_OUT"].includes(
                    row.transactionType,
                  );
                  const canAdjust =
                    row.status === "POSTED" &&
                    can("adjust") &&
                    !row.transferId &&
                    row.sourceType !== "LEDGER_HISTORY";
                  const canCancelTx =
                    row.status === "POSTED" &&
                    can("cancel") &&
                    !originOwnedSources.includes(row.sourceType);
                  return (
                    <FinanceMobileCard
                      key={row.id}
                      code={row.code}
                      muted={row.status === "CANCELLED"}
                      badge={
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          {labels[row.status]}
                        </span>
                      }
                      title={row.description || "-"}
                      meta={
                        <div>
                          {dateLabel(row.occurredAt)} · {typeLabel(row)}
                        </div>
                      }
                      amount={`${out ? "-" : "+"}${formatCurrency(row.amount)}`}
                      amountTone={out ? "negative" : "positive"}>
                      {canAdjust || canCancelTx ? (
                        <>
                          {canAdjust && (
                            <CardAction
                              onClick={() =>
                                requestAction(
                                  "adjust",
                                  row.id,
                                  row.description || "",
                                )
                              }>
                              <SquarePen className="h-3.5 w-3.5" />
                              Điều chỉnh
                            </CardAction>
                          )}
                          {canCancelTx && (
                            <CardAction
                              tone="danger"
                              onClick={() => requestAction("cancel", row.id)}>
                              <Ban className="h-3.5 w-3.5" />
                              Hủy
                            </CardAction>
                          )}
                        </>
                      ) : null}
                    </FinanceMobileCard>
                  );
                })
              )
            ) : (
              <FundClosingTable
                isMobile
                rows={closingRows}
                isLoading={closings.isLoading}
                canEdit={can("close")}
                branchId={branchId}
                creating={creatingClosing}
                onCreateClose={() => setCreatingClosing(false)}
              />
            )}
          </FinanceMobileShell>
        ) : (
          <main className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
                  Quỹ nội bộ
                </h2>
                {view === "transactions" && (
                  <input
                    type="text"
                    placeholder="Tìm mã, nội dung..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="w-64 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {view === "closings" && can("close") && (
                  <button
                    type="button"
                    onClick={() => setCreatingClosing(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    <Plus className="h-4 w-4" /> Tạo chốt sổ
                  </button>
                )}
                {view === "transactions" && (
                  <ColumnToggle
                    columns={ledgerColumns.columns}
                    onToggle={ledgerColumns.toggleColumn}
                  />
                )}
              </div>
            </div>
            {activeError && (
              <div
                role="alert"
                className="border-b bg-red-50 p-3 text-sm text-red-700">
                {activeError instanceof Error
                  ? activeError.message
                  : "Không tải được dữ liệu"}
              </div>
            )}
            {access.error && (
              <div role="alert" className="bg-red-50 p-3 text-sm text-red-700">
                {access.error instanceof Error
                  ? access.error.message
                  : "Không tải được quyền quỹ"}
              </div>
            )}
            {summary.data?.[0] && (
              <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 border-b bg-gray-50 px-4 py-2 text-sm">
                <span>Ngày {today()}</span>
                <span>
                  Đầu kỳ{" "}
                  <strong>{formatCurrency(summary.data[0].opening)}</strong>
                </span>
                <span>
                  Thu{" "}
                  <strong className="text-green-700">
                    {formatCurrency(summary.data[0].receipt)}
                  </strong>
                </span>
                <span>
                  Chi{" "}
                  <strong className="text-red-600">
                    {formatCurrency(summary.data[0].expense)}
                  </strong>
                </span>
                <span>
                  Cuối kỳ{" "}
                  <strong>{formatCurrency(summary.data[0].closing)}</strong>
                </span>
              </div>
            )}
            {view === "transactions" ? (
              <>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        {[
                          ...LEDGER_COLUMNS.filter((column) =>
                            ledgerColumns.shows(column.key),
                          ).map((column) => column.label),
                          "",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.isLoading ? (
                        <tr>
                          <td
                            colSpan={ledgerColumns.visibleCount + 1}
                            className="p-10 text-center">
                            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                          </td>
                        </tr>
                      ) : !rows.length ? (
                        <tr>
                          <td
                            colSpan={ledgerColumns.visibleCount + 1}
                            className="p-10 text-center text-gray-400">
                            Chưa có giao dịch
                          </td>
                        </tr>
                      ) : (
                        rows.map((row: InternalFundTransaction) => (
                          <tr
                            key={row.id}
                            className="border-b hover:bg-gray-50">
                            {ledgerColumns.shows("code") && (
                              <td className="max-w-48 break-all px-3 py-2 font-mono text-xs">
                                {row.code}
                              </td>
                            )}
                            {ledgerColumns.shows("date") && (
                              <td className="whitespace-nowrap px-3 py-2">
                                {dateLabel(row.occurredAt)}
                              </td>
                            )}
                            {ledgerColumns.shows("type") && (
                              <td className="px-3 py-2">{typeLabel(row)}</td>
                            )}
                            {ledgerColumns.shows("content") && (
                              <td className="max-w-64 break-words px-3 py-2">
                                {row.description}
                              </td>
                            )}
                            {ledgerColumns.shows("amount") && (
                              <td
                                className={`whitespace-nowrap px-3 py-2 text-right font-medium ${["EXPENSE", "TRANSFER_OUT"].includes(row.transactionType) ? "text-red-600" : "text-green-700"}`}>
                                {formatCurrency(row.amount)}
                              </td>
                            )}
                            {ledgerColumns.shows("status") && (
                              <td className="px-3 py-2">
                                {labels[row.status]}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                {row.status === "POSTED" && (
                                  <>
                                    {can("adjust") &&
                                      !row.transferId &&
                                      row.sourceType !== "LEDGER_HISTORY" && (
                                        <button
                                          type="button"
                                          title="Điều chỉnh nội dung"
                                          onClick={() =>
                                            requestAction(
                                              "adjust",
                                              row.id,
                                              row.description || "",
                                            )
                                          }>
                                          <SquarePen className="h-4 w-4" />
                                        </button>
                                      )}
                                    {can("cancel") &&
                                      !originOwnedSources.includes(
                                        row.sourceType,
                                      ) && (
                                        <button
                                          type="button"
                                          title={
                                            row.transferId
                                              ? "Hủy cả hai chiều chuyển tiền"
                                              : "Hủy giao dịch"
                                          }
                                          onClick={() =>
                                            requestAction("cancel", row.id)
                                          }>
                                          <Ban className="h-4 w-4 text-red-600" />
                                        </button>
                                      )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  total={transactions.data?.total || 0}
                  limit={limit}
                  limitOptions={limitOptions}
                  unit="giao dịch"
                  onPageChange={setPage}
                  onLimitChange={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <FundClosingTable
                  rows={closingRows}
                  isLoading={closings.isLoading}
                  canEdit={can("close")}
                  branchId={branchId}
                  creating={creatingClosing}
                  onCreateClose={() => setCreatingClosing(false)}
                />
                <div className="flex shrink-0 items-center justify-between border-t px-4 py-2.5 text-sm text-gray-500">
                  <span>
                    Trang {closingPage}/{closingTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      title="Trang trước"
                      disabled={closingPage === 1}
                      onClick={() => setClosingPage((value) => value - 1)}>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      title="Trang sau"
                      disabled={closingPage >= closingTotalPages}
                      onClick={() => setClosingPage((value) => value + 1)}>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        )}
      </div>
      {action && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAction(null)}>
          <form
            className="w-full max-w-md rounded-lg bg-white p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              submitAction();
            }}>
            <div className="mb-4 flex justify-between">
              <h2 className="font-semibold">
                {action.kind === "adjust" ? "Điều chỉnh" : "Hủy giao dịch quỹ"}
              </h2>
              <button
                type="button"
                title="Đóng"
                onClick={() => setAction(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {action.kind === "adjust" && (
              <label className="mb-3 block text-xs">
                Nội dung
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            <label className="block text-xs">
              Lý do
              <textarea
                value={reason}
                required
                onChange={(event) => setReason(event.target.value)}
                className="dt-input mt-1 w-full"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm text-white">
              Xác nhận
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function QuyNoiBoPage() {
  return (
    <FinancePageGuard
      permissions={[{ resource: "internal_fund", action: "view" }]}>
      <FundScreen />
    </FinancePageGuard>
  );
}
