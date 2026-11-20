"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Fuel, Plus, Users, X } from "lucide-react";
import Swal from "sweetalert2";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  CardAction,
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { CodeLink } from "@/components/shared/CodeLink";
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
import {
  readSavedFilters,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";
import {
  useCancelFuelAdvanceEntry,
  useFuelAdvance,
} from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { canVehicle } from "@/lib/internal-finance/vehicle-constants";
import { FuelAdvanceEntryModal } from "@/components/fuel-advance/FuelAdvanceEntryModal";
import type {
  FuelAdvanceCreator,
  FuelAdvanceRow,
} from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "fuel-advance-sidebar-filters";
/** Chi nhánh có tiền ứng xăng: Kho HN. */
const FUEL_ADVANCE_BRANCH_ID = 6;

const KIND_OPTIONS = [
  { value: "ADVANCE", label: "Ứng xăng (PHIẾU CHI)" },
  { value: "FUEL", label: "Phiếu xăng đã duyệt" },
];

const COLUMNS = [
  { key: "date", label: "Ngày" },
  { key: "kind", label: "Loại" },
  { key: "content", label: "Nội dung" },
  { key: "person", label: "Người" },
  { key: "method", label: "Phương thức / nguồn tiền" },
  { key: "in", label: "Ứng thêm" },
  { key: "out", label: "Đã dùng" },
  { key: "balance", label: "Còn lại" },
];
const MONEY_COLUMNS = ["in", "out", "balance"];

type SavedFilters = { kind?: string };

function dateLabel(value: string | null | undefined, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** Còn lại âm: phiếu xăng đã duyệt vượt số tiền ứng. */
function Balance({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap ${strong ? "font-semibold" : ""} ${
        value < 0 ? "text-red-600" : "text-gray-900"
      }`}>
      {formatCurrency(value)}
      {value < 0 && (
        <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
          Vượt
        </span>
      )}
    </span>
  );
}

function KindBadge({ row }: { row: FuelAdvanceRow }) {
  return row.kind === "ADVANCE" ? (
    <span className="inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      {row.source === "MANUAL" ? "Ứng nhập tay" : "Ứng xăng"}
    </span>
  ) : (
    <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      Phiếu xăng
    </span>
  );
}

/** Đơn ứng xăng trừ quỹ nào (theo nguồn tiền mặt), hoặc chuyển khoản. */
function MoneySource({ row }: { row: FuelAdvanceRow }) {
  if (row.kind === "FUEL")
    return <span className="text-xs text-gray-400">Trừ vào tiền ứng</span>;
  if (row.source === "MANUAL")
    return (
      <div>
        <div className="text-gray-700">Nhập tay</div>
        <div className="text-[11px] text-gray-400">
          Đã đi tiền trước, không ghi quỹ
        </div>
      </div>
    );
  return (
    <div>
      <div className="text-gray-700">{row.method || "-"}</div>
      <div className="text-[11px] text-gray-400">
        {row.cashSource && row.cashAmount
          ? `Trừ quỹ ${row.cashSource}: ${formatCurrency(row.cashAmount)}`
          : "Chuyển khoản: không ghi quỹ"}
      </div>
    </div>
  );
}

/** Khóa dòng: đơn Lark và khoản nhập tay có thể trùng id. */
function rowKey(row: FuelAdvanceRow) {
  return row.kind === "ADVANCE"
    ? `ADVANCE-${row.source}-${row.id}`
    : `FUEL-${row.id}`;
}

function rowContent(row: FuelAdvanceRow) {
  return row.kind === "ADVANCE"
    ? row.description || "Ứng tiền xăng xe Kho HN"
    : row.vehicle || "Xăng dầu";
}

function rowPerson(row: FuelAdvanceRow) {
  return (
    (row.kind === "ADVANCE" ? row.requesterName : row.creatorName) ||
    "Không rõ tên"
  );
}

function CreatorSummaryModal({
  rows,
  scopeLabel,
  onClose,
  onSelect,
}: {
  rows: FuelAdvanceCreator[];
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
              Phiếu xăng theo người tạo
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
              Chưa có phiếu xăng đã duyệt
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">
                    Người tạo phiếu
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Số phiếu
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Đã dùng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.creatorId ?? row.creatorName ?? "-"}
                    onClick={() => row.creatorName && onSelect(row.creatorName)}
                    className={
                      row.creatorName
                        ? "cursor-pointer hover:bg-gray-50"
                        : undefined
                    }>
                    <td className="px-4 py-2.5 text-gray-900">
                      {row.creatorName || "Không rõ tên"}
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

export default function TienUngXangPage() {
  const isMobile = useIsMobile(768);
  const [showFilters, setShowFilters] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [creating, setCreating] = useState(false);
  const access = useFinanceAccess();
  // Nhập / hủy khoản ứng tay: quyền quản lý xe ở Kho HN.
  const canManage = canVehicle(access, "manage", FUEL_ADVANCE_BRANCH_ID);
  const cancelEntry = useCancelFuelAdvanceEntry();
  const { columns, toggleColumn, shows, visibleCount } = useColumnToggle(
    "fuelAdvanceTableColumns",
    COLUMNS,
  );
  const [saved] = useState(() => readSavedFilters<SavedFilters>(STORAGE_KEY));
  const [kind, setKind] = useState(saved?.kind || "");
  const [person, setPerson] = useState("");
  const [dates, setDates] = useState<DateRange>(() =>
    loadSavedDates(STORAGE_KEY),
  );
  const time = useSavedTimeRange(STORAGE_KEY, setDates);
  useEffect(() => {
    writeSavedFilters(STORAGE_KEY, { kind });
  }, [kind]);

  const query = useFuelAdvance({
    fromDate: dates.fromDate || undefined,
    toDate: dates.toDate || undefined,
  });
  const ledger = query.data;
  // Lọc loại / người trên dòng đã tải; cột Còn lại vẫn là số dư của sổ.
  const rows = useMemo(
    () =>
      (ledger?.rows || [])
        .filter((row) => !kind || row.kind === kind)
        .filter((row) => !person || rowPerson(row) === person),
    [kind, ledger, person],
  );

  const handleCancel = async (row: FuelAdvanceRow) => {
    if (row.kind !== "ADVANCE" || row.source !== "MANUAL") return;
    const result = await Swal.fire({
      title: "Hủy khoản ứng nhập tay?",
      text: `${formatCurrency(row.amount)} đ ngày ${dateLabel(row.at)}. Khoản đã hủy không còn cộng vào tiền ứng.`,
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Lý do hủy",
      inputAttributes: { maxlength: "500" },
      inputValidator: (value) =>
        value?.trim() ? undefined : "Cần nhập lý do hủy",
      showCancelButton: true,
      confirmButtonText: "Hủy khoản ứng",
      cancelButtonText: "Giữ lại",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    cancelEntry.mutate({ id: row.id, reason: String(result.value).trim() });
  };
  const isManual = (row: FuelAdvanceRow) =>
    row.kind === "ADVANCE" && row.source === "MANUAL";
  const tableColumns = visibleCount + (canManage ? 1 : 0);

  const clearAll = () => {
    setKind("");
    setPerson("");
    time.reset();
    setDates({});
  };
  const activeCount = [kind, person, time.active].filter(Boolean).length;
  const rangeLabel =
    dates.fromDate || dates.toDate
      ? `${dates.fromDate?.split("-").reverse().join("/") || "…"} – ${
          dates.toDate?.split("-").reverse().join("/") || "…"
        }`
      : "Từ khi bắt đầu";
  const scopeLabel = `Kho Hà Nội · ${rangeLabel}`;

  const personChip = person ? (
    <button
      type="button"
      onClick={() => setPerson("")}
      title="Bỏ lọc người"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      {person}
      <X className="h-3.5 w-3.5" />
    </button>
  ) : null;

  const stats = ledger
    ? [
        { label: "Đầu kỳ", value: <Balance value={ledger.opening} /> },
        {
          label: "Ứng thêm",
          value: (
            <span className="text-green-700">
              {formatCurrency(ledger.advanced)}
            </span>
          ),
        },
        {
          label: "Đã dùng",
          value: (
            <span className="text-red-600">{formatCurrency(ledger.used)}</span>
          ),
        },
        { label: "Còn lại", value: <Balance value={ledger.closing} strong /> },
      ]
    : [];

  return (
    <FinancePageGuard permissions={[{ resource: "vehicles", action: "view" }]}>
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
            label="Thời gian"
            value={time.range}
            onChange={time.change}
          />
          <FilterDivider />
          <FilterSection label="Loại">
            <FilterSearchableSelect
              options={KIND_OPTIONS}
              value={kind}
              onChange={setKind}
              placeholder="Tất cả"
              searchable={false}
            />
          </FilterSection>
        </FinanceFilterSidebar>

        {isMobile ? (
          <FinanceMobileShell
            title="Tiền ứng xăng xe"
            activeFilterCount={activeCount}
            onOpenFilter={() => setShowFilters(true)}
            actions={
              <>
                {personChip}
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700">
                  Theo người tạo
                </button>
              </>
            }
            onCreate={canManage ? () => setCreating(true) : undefined}
            summary={
              ledger ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500">
                  {stats.map((stat) => (
                    <span key={stat.label}>
                      {stat.label}: <strong>{stat.value}</strong>
                    </span>
                  ))}
                </div>
              ) : null
            }
            isLoading={query.isLoading}
            isEmpty={rows.length === 0}
            emptyText="Chưa có tiền ứng hay phiếu xăng trong khoảng này">
            {rows.map((row) => (
              <FinanceMobileCard
                key={rowKey(row)}
                code={
                  row.kind === "FUEL" ? (
                    <CodeLink entity="vehicle-entry" code={row.code} />
                  ) : (
                    rowPerson(row)
                  )
                }
                badge={<KindBadge row={row} />}
                title={rowContent(row)}
                meta={
                  <>
                    <div>
                      {dateLabel(row.at, true)}
                      {row.kind === "FUEL" && ` · ${rowPerson(row)}`}
                    </div>
                    <div className="mt-1">
                      <MoneySource row={row} />
                    </div>
                    <div className="mt-1">
                      Còn lại: <Balance value={row.balance} />
                    </div>
                  </>
                }
                amount={`${row.kind === "ADVANCE" ? "+" : "-"}${formatCurrency(row.amount)}`}
                amountTone={row.kind === "ADVANCE" ? "positive" : "negative"}>
                {canManage && isManual(row) && (
                  <CardAction
                    tone="danger"
                    onClick={() => void handleCancel(row)}>
                    Hủy khoản ứng
                  </CardAction>
                )}
              </FinanceMobileCard>
            ))}
          </FinanceMobileShell>
        ) : (
          <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Fuel className="h-5 w-5 text-brand" />
                  <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
                    Tiền ứng xăng xe
                  </h2>
                  <span className="whitespace-nowrap text-sm text-gray-500">
                    Kho Hà Nội
                    {ledger && ` · tính từ ${dateLabel(ledger.startDate)}`}
                  </span>
                </div>
                {personChip}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Users className="h-4 w-4" />
                  Theo người tạo
                </button>
                <ColumnToggle columns={columns} onToggle={toggleColumn} />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    <Plus className="h-4 w-4" />
                    Nhập khoản ứng
                  </button>
                )}
              </div>
            </div>
            {ledger && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-6 gap-y-1 border-b px-4 py-2 text-sm text-gray-500">
                <span className="mr-auto text-xs text-gray-400">
                  {rangeLabel}
                </span>
                {stats.map((stat) => (
                  <span key={stat.label}>
                    {stat.label}: <strong>{stat.value}</strong>
                  </span>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="sticky top-0 z-10 border-b bg-gray-50">
                  <tr>
                    {COLUMNS.filter((column) => shows(column.key)).map(
                      (column) => (
                        <th
                          key={column.key}
                          className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                            MONEY_COLUMNS.includes(column.key)
                              ? "text-right"
                              : "text-left"
                          }`}>
                          {column.label}
                        </th>
                      ),
                    )}
                    {canManage && <th className="w-12 px-2 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {query.isLoading ? (
                    <tr>
                      <td
                        colSpan={tableColumns}
                        className="py-16 text-center text-sm text-gray-400">
                        Đang tải...
                      </td>
                    </tr>
                  ) : query.isError ? (
                    <tr>
                      <td
                        colSpan={tableColumns}
                        className="py-16 text-center text-sm text-red-600">
                        {query.error instanceof Error
                          ? query.error.message
                          : "Không tải được dữ liệu"}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableColumns}
                        className="py-16 text-center text-sm text-gray-400">
                        Chưa có tiền ứng hay phiếu xăng trong khoảng này
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={rowKey(row)}
                        className="align-top hover:bg-gray-50">
                        {shows("date") && (
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            <div>{dateLabel(row.at, true)}</div>
                            {row.kind === "FUEL" && (
                              <div className="text-[11px] text-gray-400">
                                Ngày đổ {dateLabel(row.occurredAt)}
                              </div>
                            )}
                          </td>
                        )}
                        {shows("kind") && (
                          <td className="px-4 py-3">
                            <KindBadge row={row} />
                          </td>
                        )}
                        {shows("content") && (
                          <td className="px-4 py-3 text-gray-700">
                            {row.kind === "FUEL" && (
                              <CodeLink
                                entity="vehicle-entry"
                                code={row.code}
                                className="font-mono text-xs text-brand hover:underline"
                              />
                            )}
                            <div>{rowContent(row)}</div>
                          </td>
                        )}
                        {shows("person") && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setPerson(rowPerson(row))}
                              title="Lọc theo người này"
                              className="text-left font-medium text-gray-900 hover:text-brand">
                              {rowPerson(row)}
                            </button>
                          </td>
                        )}
                        {shows("method") && (
                          <td className="px-4 py-3">
                            <MoneySource row={row} />
                          </td>
                        )}
                        {shows("in") && (
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                            {row.kind === "ADVANCE"
                              ? formatCurrency(row.amount)
                              : ""}
                          </td>
                        )}
                        {shows("out") && (
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600">
                            {row.kind === "FUEL"
                              ? formatCurrency(row.amount)
                              : ""}
                          </td>
                        )}
                        {shows("balance") && (
                          <td className="px-4 py-3 text-right">
                            <Balance value={row.balance} />
                          </td>
                        )}
                        {canManage && (
                          <td className="px-2 py-3 text-center">
                            {isManual(row) && (
                              <button
                                type="button"
                                title="Hủy khoản ứng nhập tay"
                                onClick={() => void handleCancel(row)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {creating && (
        <FuelAdvanceEntryModal
          startDate={
            ledger
              ? new Date(new Date(ledger.startDate).getTime() + 7 * 3600 * 1000)
                  .toISOString()
                  .slice(0, 10)
              : "2026-11-14"
          }
          onClose={() => setCreating(false)}
        />
      )}
      {showPeople && (
        <CreatorSummaryModal
          rows={ledger?.byCreator || []}
          scopeLabel={scopeLabel}
          onClose={() => setShowPeople(false)}
          onSelect={(name) => {
            setPerson(name);
            setShowPeople(false);
          }}
        />
      )}
    </FinancePageGuard>
  );
}
