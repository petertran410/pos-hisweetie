"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileCheck2, X } from "lucide-react";
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
import { useLarkApprovals } from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  readSavedFilters,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";
import type { LarkApprovalRow } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";
import { TablePagination } from "@/components/shared/TablePagination";
import { usePageSize } from "@/lib/hooks/usePageSize";

const BRANCH_IDS = [6, 1, 4, 7];
const STORAGE_KEY = "lark-approval-sidebar-filters";

const FORM_OPTIONS = [
  { value: "PHIEU_CHI", label: "PHIẾU CHI" },
  { value: "PHIEU_THU", label: "PHIẾU THU" },
  { value: "PHIEU_CHI_KHO_HN", label: "PHIẾU CHI KHO HN" },
  { value: "PHIEU_CHI_KHO_SG", label: "PHIẾU CHI KHO SG" },
];
const FORM_LABELS = Object.fromEntries(
  FORM_OPTIONS.map((option) => [option.value, option.label]),
);

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

const SCOPE_OPTIONS = [
  { value: "IN", label: "Vào Tài chính nội bộ (tiền mặt kho)" },
  { value: "OUT", label: "Chỉ xem (ngoài tiền mặt kho)" },
];

const COLUMNS = [
  { key: "form", label: "Form" },
  { key: "date", label: "Ngày" },
  { key: "fund", label: "Quỹ / nguồn tiền" },
  { key: "content", label: "Nội dung" },
  { key: "amount", label: "Số tiền" },
  { key: "method", label: "Phương thức" },
  { key: "requester", label: "Người đề xuất" },
  { key: "status", label: "Trạng thái Lark" },
  { key: "pos", label: "Tài chính nội bộ" },
];

type SavedFilters = {
  branchIds?: number[];
  formKind?: string;
  status?: string;
  scope?: string;
  suspect?: boolean;
};

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

function dateLabel(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function rowAmount(row: LarkApprovalRow) {
  return row.cashAmount ?? row.amount ?? 0;
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

/** Dòng Tài chính nội bộ đã tạo, hoặc vì sao đơn chưa / không được ghi nhận. */
function PosResult({ row }: { row: LarkApprovalRow }) {
  return (
    <div className="space-y-1 text-xs">
      {row.entry ? (
        <Link
          href={`/tai-chinh/tai-chinh-noi-bo?Code=${encodeURIComponent(row.entry.code)}`}
          className="font-mono text-brand hover:underline">
          {row.entry.code}
        </Link>
      ) : !row.inScope ? (
        <span className="text-gray-500">
          {row.skipReason || "Ngoài phạm vi"}
        </span>
      ) : row.status === "APPROVED" ? (
        <span className="text-amber-700">Chưa vào Tài chính nội bộ</span>
      ) : (
        <span className="text-gray-400">Ghi nhận khi đơn được duyệt</span>
      )}
      {row.entry?.status === "CANCELLED" && (
        <div className="text-red-600">Dòng đã hủy</div>
      )}
      {row.suspectDuplicate && (
        <div
          className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700"
          title="Có phiếu POS cùng quỹ, cùng số tiền, lệch tối đa 2 ngày">
          Có thể trùng {row.suspectDuplicate.code}
        </div>
      )}
    </div>
  );
}

export default function DonLarkApprovalPage() {
  const access = useFinanceAccess();
  const canView = useCallback(
    (id: number) => access.can("lark_approval", "view", id),
    [access],
  );
  const isMobile = useIsMobile(768);
  const [showFilters, setShowFilters] = useState(false);
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter(
        (branch) => BRANCH_IDS.includes(branch.id) && canView(branch.id),
      ),
    [branchData, canView],
  );
  const { columns, toggleColumn, shows, visibleCount } = useColumnToggle(
    "larkApprovalTableColumns",
    COLUMNS,
  );
  const [saved] = useState(() => readSavedFilters<SavedFilters>(STORAGE_KEY));
  const [branchId, setBranchId] = useState<number | undefined>(
    () => saved?.branchIds?.[0],
  );
  const [formKind, setFormKind] = useState(saved?.formKind || "");
  const [status, setStatus] = useState(saved?.status || "");
  const [scope, setScope] = useState(saved?.scope || "");
  const [suspect, setSuspect] = useState(Boolean(saved?.suspect));
  const [dates, setDates] = useState<DateRange>(() =>
    loadSavedDates(STORAGE_KEY),
  );
  const time = useSavedTimeRange(STORAGE_KEY, setDates);
  useEffect(() => {
    writeSavedFilters(STORAGE_KEY, {
      branchIds: branchId ? [branchId] : [],
      formKind,
      status,
      scope,
      suspect,
    });
  }, [branchId, formKind, scope, status, suspect]);

  // Link "Xem đơn Lark" từ Phiếu chi văn phòng: ?search=<mã phiếu>.
  const searchParam = useSearchParams().get("search")?.trim() || "";
  const [search, setSearch] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      branchIds: branchId ? [branchId] : undefined,
      formKind: formKind || undefined,
      status: status || undefined,
      scope: scope || undefined,
      suspect: suspect ? "true" : undefined,
      fromDate: dates.fromDate || undefined,
      toDate: dates.toDate || undefined,
      search: debouncedSearch || undefined,
    }),
    [branchId, dates, debouncedSearch, formKind, scope, status, suspect],
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit, limitOptions] = usePageSize(
    "larkApprovalPageSize",
    50,
  );
  // Đổi bộ lọc thì về trang 1.
  const filterKey = JSON.stringify(filters);
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  if (filterKey !== seenFilterKey) {
    setSeenFilterKey(filterKey);
    setPage(1);
  }
  const query = useLarkApprovals({ ...filters, page, limit });
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const totalAmount = query.data?.totalAmount || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const clearAll = () => {
    setBranchId(undefined);
    setFormKind("");
    setStatus("");
    setScope("");
    setSuspect(false);
    time.reset();
    setDates({});
  };
  const activeCount = [
    branchId,
    formKind,
    status,
    scope,
    suspect,
    time.active,
  ].filter(Boolean).length;

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

  return (
    <FinancePageGuard
      permissions={[{ resource: "lark_approval", action: "view" }]}>
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
            label="Ngày chi / thu"
            value={time.range}
            onChange={time.change}
          />
          <FilterDivider />
          {selectFilter(
            "Quỹ",
            branches.map((branch) => ({
              value: String(branch.id),
              label: branch.name,
            })),
            branchId ? String(branchId) : "",
            (value) => setBranchId(value ? Number(value) : undefined),
            "Tất cả quỹ",
          )}
          {selectFilter(
            "Form",
            FORM_OPTIONS,
            formKind,
            setFormKind,
            "Cả 4 form",
          )}
          {selectFilter(
            "Trạng thái Lark",
            STATUS_OPTIONS,
            status,
            setStatus,
            "Tất cả trạng thái",
          )}
          <FilterDivider />
          {selectFilter(
            "Phạm vi",
            SCOPE_OPTIONS,
            scope,
            setScope,
            "Tất cả đơn",
          )}
          <FilterSection label="Đối chiếu">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={suspect}
                onChange={(event) => setSuspect(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              Chỉ đơn có thể trùng phiếu POS
            </label>
          </FilterSection>
        </FinanceFilterSidebar>

        {isMobile ? (
          <FinanceMobileShell
            title="Đơn Lark Approval"
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm nội dung, người đề xuất, mã phiếu..."
            activeFilterCount={activeCount}
            onOpenFilter={() => setShowFilters(true)}
            summary={
              <div className="flex items-center justify-between text-gray-500">
                <span>
                  <strong className="text-gray-900">{total}</strong> đơn
                </span>
                <span>
                  Tổng tiền:{" "}
                  <strong className="text-gray-900">
                    {formatCurrency(totalAmount)}
                  </strong>
                </span>
              </div>
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
                code={FORM_LABELS[row.formKind] || row.formKind}
                badge={<StatusBadge status={row.status} />}
                title={row.description || "-"}
                muted={["REJECTED", "CANCELED", "DELETED", "REVERTED"].includes(
                  row.status,
                )}
                meta={
                  <>
                    <div>
                      {dateLabel(row.occurredAt)}
                      {row.cashSource ? ` · ${row.cashSource}` : ""}
                      {row.requesterName ? ` · ${row.requesterName}` : ""}
                    </div>
                    <div className="mt-1">
                      <PosResult row={row} />
                    </div>
                  </>
                }
                amount={`${row.direction === "RECEIPT" ? "+" : "-"}${formatCurrency(rowAmount(row))}`}
                amountTone={
                  row.direction === "RECEIPT" ? "positive" : "negative"
                }
              />
            ))}
          </FinanceMobileShell>
        ) : (
          <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-brand" />
                  <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Đơn Lark Approval
                  </h2>
                </div>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm nội dung, người đề xuất, mã phiếu..."
                    className="h-9 w-72 rounded-lg border px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                <span className="whitespace-nowrap text-sm text-gray-500">
                  <strong className="text-gray-900">{total}</strong> đơn ·{" "}
                  <strong className="text-gray-900">
                    {formatCurrency(totalAmount)}
                  </strong>
                </span>
              </div>
              <ColumnToggle columns={columns} onToggle={toggleColumn} />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1100px] text-sm">
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
                </thead>
                <tbody className="divide-y">
                  {query.isLoading ? (
                    <tr>
                      <td
                        colSpan={visibleCount}
                        className="py-16 text-center text-sm text-gray-400">
                        Đang tải đơn Lark...
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
                      <tr key={row.id} className="align-top hover:bg-gray-50">
                        {shows("form") && (
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                            {FORM_LABELS[row.formKind] || row.formKind}
                          </td>
                        )}
                        {shows("date") && (
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            <div>{dateLabel(row.occurredAt)}</div>
                            {row.completedAt && (
                              <div className="text-[11px] text-gray-400">
                                Duyệt {dateLabel(row.completedAt)}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("fund") && (
                          <td className="px-4 py-3 text-gray-700">
                            <div>{row.branchName || "-"}</div>
                            {row.cashSource && (
                              <div className="text-[11px] text-gray-400">
                                {row.cashSource}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("content") && (
                          <td className="max-w-[320px] px-4 py-3 text-gray-800">
                            <div className="line-clamp-2 break-words">
                              {row.description || "-"}
                            </div>
                          </td>
                        )}
                        {shows("amount") && (
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                              row.direction === "RECEIPT"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                            {formatCurrency(rowAmount(row))}
                            {row.cashAmount != null &&
                              row.amount != null &&
                              row.cashAmount !== row.amount && (
                                <div className="text-[11px] font-normal text-gray-400">
                                  Tổng đơn {formatCurrency(row.amount)}
                                </div>
                              )}
                          </td>
                        )}
                        {shows("method") && (
                          <td className="px-4 py-3 text-gray-700">
                            {row.method || "-"}
                          </td>
                        )}
                        {shows("requester") && (
                          <td className="px-4 py-3 text-gray-700">
                            {row.requesterName || "-"}
                          </td>
                        )}
                        {shows("status") && (
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                        )}
                        {shows("pos") && (
                          <td className="px-4 py-3">
                            <PosResult row={row} />
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
    </FinancePageGuard>
  );
}
