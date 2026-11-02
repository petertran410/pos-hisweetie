"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HandCoins, Users, X } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
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
import { useBranches } from "@/lib/hooks/useBranches";
import { useSalaryAdvances } from "@/lib/hooks/useInternalFinance";
import {
  readSavedFilters,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";
import type {
  SalaryAdvancePerson,
  SalaryAdvanceRow,
} from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";
import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";

/** Quỹ tiền mặt có thể chi tạm ứng lương. */
const FUND_BRANCH_IDS = [6, 1, 4, 7];
const STORAGE_KEY = "salary-advance-sidebar-filters";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Đang duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELED", label: "Đã rút đơn" },
  { value: "DELETED", label: "Đã xóa" },
  { value: "REVERTED", label: "Đã thu hồi" },
];
const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);
const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-100 text-gray-600",
  DELETED: "bg-gray-100 text-gray-600",
  REVERTED: "bg-orange-100 text-orange-700",
};
const INACTIVE = ["REJECTED", "CANCELED", "DELETED", "REVERTED"];

const METHOD_OPTIONS = [
  { value: "CASH", label: "Tiền mặt (chi từ quỹ)" },
  { value: "TRANSFER", label: "Chuyển khoản công ty" },
];

const COLUMNS = [
  { key: "date", label: "Ngày đề xuất" },
  { key: "requester", label: "Người ứng" },
  { key: "amount", label: "Số tiền" },
  { key: "method", label: "Phương thức" },
  { key: "status", label: "Trạng thái" },
  { key: "fund", label: "Quỹ POS" },
];

type SavedFilters = {
  branchIds?: number[];
  status?: string;
  method?: string;
};

function asBranches(payload: unknown) {
  if (Array.isArray(payload))
    return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  )
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  return [];
}

function dateLabel(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_CLASS[status] || "bg-gray-100 text-gray-600"
      }`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/** Đơn có trừ quỹ POS không, và phiếu / dòng quỹ nào. */
function FundResult({ row }: { row: SalaryAdvanceRow }) {
  if (!row.cash)
    return <span className="text-xs text-gray-400">Chuyển khoản</span>;
  if (row.entry)
    return (
      <div className="space-y-0.5 text-xs">
        <Link
          href={`/tai-chinh/tai-chinh-noi-bo?Code=${encodeURIComponent(row.entry.code)}`}
          className="font-mono text-brand hover:underline">
          {row.entry.code}
        </Link>
        {row.entry.status === "CANCELLED" && (
          <div className="text-red-600">Đã hủy</div>
        )}
        {row.entry.fundTransaction?.code && (
          <div className="font-mono text-gray-500">
            {row.entry.fundTransaction.code}
          </div>
        )}
      </div>
    );
  if (!row.inScope)
    return (
      <span className="text-xs text-gray-500">
        {row.skipReason || "Quỹ chưa dùng trên POS"}
      </span>
    );
  if (row.status === "PENDING")
    return (
      <span className="text-xs text-gray-400">Trừ quỹ khi được duyệt</span>
    );
  if (row.status === "APPROVED")
    return (
      <span
        className="text-xs text-gray-400"
        title="Đơn duyệt trước khi POS nhận tạm ứng lương: sổ quỹ Lark đã ghi">
        Sổ quỹ Lark đã ghi
      </span>
    );
  return <span className="text-xs text-gray-400">-</span>;
}

function PersonSummaryModal({
  rows,
  scopeLabel,
  onClose,
  onSelect,
}: {
  rows: SalaryAdvancePerson[];
  scopeLabel: string;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Users className="h-5 w-5 text-brand" />
              Tạm ứng lương theo người
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{scopeLabel}</p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Chưa có đơn đã duyệt
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">
                    Người ứng
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">Số đơn</th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Tổng tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.requesterName || "-"}
                    onClick={() =>
                      row.requesterName && onSelect(row.requesterName)
                    }
                    className={
                      row.requesterName
                        ? "cursor-pointer hover:bg-gray-50"
                        : undefined
                    }>
                    <td className="px-4 py-2.5 text-gray-900">
                      <div>{row.requesterName || "Không rõ tên"}</div>
                      <div className="text-[11px] text-gray-400">
                        Gần nhất {dateLabel(row.lastRequestDate)}
                        {row.cashAmount > 0 &&
                          ` · Tiền mặt ${formatCurrency(row.cashAmount)}`}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {row.count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-gray-900">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-3 text-sm sm:px-5">
          <span className="text-gray-500">{rows.length} người</span>
          <span>
            Tổng:{" "}
            <strong className="text-gray-900">{formatCurrency(total)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TamUngLuongPage() {
  const isMobile = useIsMobile(768);
  const [showFilters, setShowFilters] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter((branch) =>
        FUND_BRANCH_IDS.includes(branch.id),
      ),
    [branchData],
  );
  const { columns, toggleColumn, shows, visibleCount } = useColumnToggle(
    "salaryAdvanceTableColumns",
    COLUMNS,
  );
  const [saved] = useState(() => readSavedFilters<SavedFilters>(STORAGE_KEY));
  const [branchId, setBranchId] = useState<number | undefined>(
    () => saved?.branchIds?.[0],
  );
  const [status, setStatus] = useState(saved?.status || "");
  const [method, setMethod] = useState(saved?.method || "");
  const [requester, setRequester] = useState("");
  const [dates, setDates] = useState<DateRange>(() =>
    loadSavedDates(STORAGE_KEY),
  );
  const time = useSavedTimeRange(STORAGE_KEY, setDates);
  useEffect(() => {
    writeSavedFilters(STORAGE_KEY, {
      branchIds: branchId ? [branchId] : [],
      status,
      method,
    });
  }, [branchId, method, status]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      branchIds: branchId ? [branchId] : undefined,
      status: status || undefined,
      method: method || undefined,
      requester: requester || undefined,
      fromDate: dates.fromDate || undefined,
      toDate: dates.toDate || undefined,
      search: debouncedSearch || undefined,
    }),
    [branchId, dates, debouncedSearch, method, requester, status],
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit, limitOptions] = usePageSize(
    "salaryAdvancePageSize",
    50,
  );
  // Đổi bộ lọc thì về trang 1.
  const filterKey = JSON.stringify(filters);
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  if (filterKey !== seenFilterKey) {
    setSeenFilterKey(filterKey);
    setPage(1);
  }
  const query = useSalaryAdvances({ ...filters, page, limit });
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const totals = query.data?.totals;
  const byPerson = query.data?.byPerson || [];
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const clearAll = () => {
    setBranchId(undefined);
    setStatus("");
    setMethod("");
    setRequester("");
    time.reset();
    setDates({});
  };
  const activeCount = [branchId, status, method, requester, time.active].filter(
    Boolean,
  ).length;

  const scopeLabel = [
    branchId
      ? branches.find((branch) => branch.id === branchId)?.name
      : "Mọi quỹ / chuyển khoản",
    dates.fromDate || dates.toDate
      ? `${dates.fromDate?.split("-").reverse().join("/") || "…"} – ${
          dates.toDate?.split("-").reverse().join("/") || "…"
        }`
      : "Toàn thời gian",
    "chỉ đơn đã duyệt",
  ]
    .filter(Boolean)
    .join(" · ");

  const selectFilter = (
    label: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
  ) => (
    <FilterSection label={label}>
      <FilterSearchableSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchable={false}
      />
    </FilterSection>
  );

  const requesterChip = requester ? (
    <button
      type="button"
      onClick={() => setRequester("")}
      title="Bỏ lọc người ứng"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      {requester}
      <X className="h-3.5 w-3.5" />
    </button>
  ) : null;

  const approvedSummary = totals ? (
    <span className="whitespace-nowrap text-sm text-gray-500">
      <strong className="text-gray-900">{total}</strong> đơn · Đã duyệt{" "}
      <strong className="text-gray-900">{totals.approvedCount}</strong> đơn,{" "}
      <strong className="text-gray-900">
        {formatCurrency(totals.approvedAmount)}
      </strong>
      {totals.approvedCashAmount > 0 && (
        <>
          {" "}
          (tiền mặt{" "}
          <strong className="text-gray-900">
            {formatCurrency(totals.approvedCashAmount)}
          </strong>
          )
        </>
      )}
    </span>
  ) : null;

  return (
    <FinancePageGuard
      permissions={[{ resource: "salary_advance", action: "view" }]}>
      <div
        className={`flex h-full min-h-0 overflow-hidden border-t ${
          isMobile ? "flex-col" : ""
        }`}
        style={{ borderColor: "var(--dt-border)" }}>
        <FinanceFilterSidebar
          activeCount={activeCount}
          onClear={clearAll}
          mobileOpen={showFilters}
          onMobileClose={isMobile ? () => setShowFilters(false) : undefined}>
          <TimeRangeFilter
            label="Ngày đề xuất"
            value={time.range}
            onChange={time.change}
          />
          <FilterDivider />
          {selectFilter(
            "Trạng thái",
            STATUS_OPTIONS,
            status,
            setStatus,
            "Tất cả trạng thái",
          )}
          {selectFilter(
            "Phương thức",
            METHOD_OPTIONS,
            method,
            setMethod,
            "Tiền mặt và chuyển khoản",
          )}
          {selectFilter(
            "Quỹ chi",
            branches.map((branch) => ({
              value: String(branch.id),
              label: branch.name,
            })),
            branchId ? String(branchId) : "",
            (value) => setBranchId(value ? Number(value) : undefined),
            "Tất cả",
          )}
        </FinanceFilterSidebar>

        {isMobile ? (
          <FinanceMobileShell
            title="Tạm ứng lương"
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm người ứng..."
            activeFilterCount={activeCount}
            onOpenFilter={() => setShowFilters(true)}
            actions={
              <>
                {requesterChip}
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700">
                  Theo người
                </button>
              </>
            }
            summary={
              totals ? (
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-gray-500">
                  <span>
                    <strong className="text-gray-900">{total}</strong> đơn
                  </span>
                  <span>
                    Đã duyệt:{" "}
                    <strong className="text-gray-900">
                      {formatCurrency(totals.approvedAmount)}
                    </strong>
                  </span>
                </div>
              ) : null
            }
            isLoading={query.isLoading}
            isEmpty={rows.length === 0}
            emptyText="Không có đơn phù hợp"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}>
            {rows.map((row) => (
              <FinanceMobileCard
                key={row.id}
                code={row.requesterName || "Không rõ tên"}
                badge={<StatusBadge status={row.status} />}
                title={row.department || row.method || "-"}
                muted={INACTIVE.includes(row.status)}
                meta={
                  <>
                    <div>
                      {dateLabel(row.requestDate)}
                      {row.cashSource ? ` · ${row.cashSource}` : ""}
                    </div>
                    <div className="mt-1">
                      <FundResult row={row} />
                    </div>
                  </>
                }
                amount={`-${formatCurrency(row.amount ?? 0)}`}
                amountTone="negative"
              />
            ))}
          </FinanceMobileShell>
        ) : (
          <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <HandCoins className="h-5 w-5 text-brand" />
                  <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Tạm ứng lương
                  </h2>
                </div>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm người ứng..."
                    className="h-9 w-60 rounded-lg border px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {search && (
                    <button
                      type="button"
                      title="Xóa tìm kiếm"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {requesterChip}
                {approvedSummary}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Users className="h-4 w-4" />
                  Theo người
                </button>
                <ColumnToggle columns={columns} onToggle={toggleColumn} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10 border-b bg-gray-50">
                  <tr>
                    {COLUMNS.filter((column) => shows(column.key)).map(
                      (column) => (
                        <th
                          key={column.key}
                          className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                            column.key === "amount" ? "text-right" : "text-left"
                          }`}>
                          {column.label}
                        </th>
                      ),
                    )}
                  </tr>
                  {totals && shows("amount") && (
                    <tr className="border-b bg-gray-50/60">
                      {COLUMNS.filter((column) => shows(column.key)).map(
                        (column) => (
                          <td
                            key={column.key}
                            className={`whitespace-nowrap px-4 py-2 ${
                              column.key === "amount" ? "text-right" : ""
                            }`}>
                            {column.key === "amount" && (
                              <span
                                className="font-semibold text-red-600"
                                title="Tổng các đơn đã duyệt khớp bộ lọc">
                                {formatCurrency(totals.approvedAmount)}
                              </span>
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y">
                  {query.isLoading ? (
                    <tr>
                      <td
                        colSpan={visibleCount}
                        className="py-16 text-center text-sm text-gray-400">
                        Đang tải...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleCount}
                        className="py-16 text-center text-sm text-gray-400">
                        Không có đơn phù hợp
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`align-top hover:bg-gray-50 ${
                          INACTIVE.includes(row.status) ? "text-gray-400" : ""
                        }`}>
                        {shows("date") && (
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            <div>{dateLabel(row.requestDate)}</div>
                            {row.completedAt && row.status === "APPROVED" && (
                              <div className="text-[11px] text-gray-400">
                                Duyệt {dateLabel(row.completedAt)}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("requester") && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={!row.requesterName}
                              onClick={() =>
                                row.requesterName &&
                                setRequester(row.requesterName)
                              }
                              title="Lọc theo người này"
                              className="text-left font-medium text-gray-900 hover:text-brand disabled:hover:text-gray-900">
                              {row.requesterName || "Không rõ tên"}
                            </button>
                            {row.department && (
                              <div className="text-[11px] text-gray-400">
                                {row.department}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("amount") && (
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600">
                            {formatCurrency(row.amount ?? 0)}
                          </td>
                        )}
                        {shows("method") && (
                          <td className="px-4 py-3 text-gray-700">
                            <div>{row.method || "-"}</div>
                            {row.cash && row.cashSource && (
                              <div className="text-[11px] text-gray-400">
                                {row.cashSource}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("status") && (
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                        )}
                        {shows("fund") && (
                          <td className="px-4 py-3">
                            <FundResult row={row} />
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
              unit="đơn"
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
      {showPeople && (
        <PersonSummaryModal
          rows={byPerson}
          scopeLabel={scopeLabel}
          onClose={() => setShowPeople(false)}
          onSelect={(name) => {
            setRequester(name);
            setShowPeople(false);
          }}
        />
      )}
    </FinancePageGuard>
  );
}
