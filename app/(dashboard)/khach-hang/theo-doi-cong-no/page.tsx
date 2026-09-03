"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Ticket as TicketIcon,
  RefreshCw,
  X,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { DebtTrackingTable } from "@/components/debt-tracking/DebtTrackingTable";
import { CreateDebtTicketModal } from "@/components/debt-tracking/CreateDebtTicketModal";
import {
  useDebtTracking,
  useDebtTrackingSummary,
  useExportDebtTracking,
} from "@/lib/hooks/useDebtTracking";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  DebtStatus,
  DebtForm,
  DebtTrackingParams,
  DEBT_FORM_LABELS,
  DebtTrackingRow,
  debtTrackingApi,
} from "@/lib/api/debt-tracking";
import { formatCurrency } from "@/lib/utils";

const TABS: { value: DebtStatus | "ALL"; label: string; tone: string }[] = [
  { value: "ALL", label: "Tất cả", tone: "text-gray-700" },
  { value: "OVERDUE", label: "Quá Hạn", tone: "text-red-600" },
  { value: "DUE", label: "Đến Hạn", tone: "text-orange-600" },
  { value: "NORMAL", label: "Bình Thường", tone: "text-gray-500" },
];

export default function TheoDoiCongNoPage() {
  const [tab, setTab] = useState<DebtStatus | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [debtForm, setDebtForm] = useState<DebtForm | "">("");
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [withoutOpenTicket, setWithoutOpenTicket] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedRowsById, setSelectedRowsById] = useState<
    Record<number, DebtTrackingRow>
  >({});
  const [selectAllPending, setSelectAllPending] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);

  const canCreateTicket = usePermission("debt_tickets", "create");
  const canExport = usePermission("debt_tracking", "export");

  const params: DebtTrackingParams = useMemo(
    () => ({
      search: search || undefined,
      debtStatus: tab === "ALL" ? undefined : tab,
      debtForm: debtForm || undefined,
      overLimitOnly: overLimitOnly || undefined,
      withoutOpenTicket: withoutOpenTicket || undefined,
      page,
      pageSize,
    }),
    [search, tab, debtForm, overLimitOnly, withoutOpenTicket, page, pageSize]
  );

  // Summary dùng chung filter nhưng bỏ debtStatus để luôn thấy bức tranh
  // tổng thể của tập đang lọc.
  const summaryParams = useMemo(
    () => ({ ...params, debtStatus: undefined, page: 1 }),
    [params]
  );

  const { data: summary } = useDebtTrackingSummary(summaryParams);
  const { data: listData } = useDebtTracking(params);
  const exportMut = useExportDebtTracking();

  const selectedRows = useMemo(() => {
    const rowsById = new Map<number, DebtTrackingRow>(
      Object.values(selectedRowsById).map((row) => [row.customerId, row])
    );
    for (const row of listData?.data ?? []) {
      if (selected.includes(row.customerId)) rowsById.set(row.customerId, row);
    }
    return selected
      .map((customerId) => rowsById.get(customerId))
      .filter((row): row is DebtTrackingRow => Boolean(row));
  }, [listData, selected, selectedRowsById]);

  const handleSelectedChange = (ids: number[]) => {
    setSelected(ids);
    const currentRows = new Map(
      (listData?.data ?? []).map((row) => [row.customerId, row])
    );
    setSelectedRowsById((previous) => {
      const next: Record<number, DebtTrackingRow> = {};
      for (const customerId of ids) {
        const row = currentRows.get(customerId) ?? previous[customerId];
        if (row) next[customerId] = row;
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected([]);
    setSelectedRowsById({});
  };

  const handleSelectAll = async (checked: boolean) => {
    if (!checked) {
      clearSelection();
      return;
    }

    setSelectAllPending(true);
    try {
      const allRows: DebtTrackingRow[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await debtTrackingApi.getList({
          ...params,
          page: currentPage,
          pageSize: 200,
        });
        allRows.push(...response.data);
        totalPages = response.pagination.totalPages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      setSelected(allRows.map((row) => row.customerId));
      setSelectedRowsById(
        Object.fromEntries(
          allRows.map((row) => [row.customerId, row] as const)
        )
      );
    } catch (error) {
      console.error("Không thể chọn toàn bộ khách hàng công nợ:", error);
    } finally {
      setSelectAllPending(false);
    }
  };

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
    clearSelection();
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setDebtForm("");
    setOverLimitOnly(false);
    setWithoutOpenTicket(false);
    setTab("ALL");
    setPage(1);
    clearSelection();
  };

  const hasFilter =
    !!search || !!debtForm || overLimitOnly || withoutOpenTicket || tab !== "ALL";

  return (
    <PagePermissionGuard resource="debt_tracking" action="view">
      <div className="flex flex-col h-full p-4 gap-3">
        {/* Thẻ tổng hợp */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <SummaryCard
            label="Khách đang theo dõi"
            value={summary ? String(summary.totalCustomers) : "—"}
          />
          <SummaryCard
            label="Tổng dư nợ"
            value={summary ? formatCurrency(summary.totalDebt) : "—"}
          />
          <SummaryCard
            label="Cần thu ngay"
            value={summary ? formatCurrency(summary.requiredPaymentAmount) : "—"}
            tone="text-red-600"
          />
          <SummaryCard
            label="Theo hạn mức"
            value={summary ? formatCurrency(summary.limitOverdueAmount) : "—"}
            tone="text-orange-600"
          />
          <SummaryCard
            label="Theo hóa đơn"
            value={summary ? formatCurrency(summary.invoiceRequiredAmount) : "—"}
            tone="text-red-600"
          />
          <SummaryCard
            label="Đang có phiếu thu hồi"
            value={summary ? String(summary.customersWithOpenTicket) : "—"}
          />
        </div>

        {/* Thanh công cụ */}
        <div className="bg-white border rounded-lg">
          <div className="flex items-center gap-1 px-3 pt-2 border-b overflow-x-auto">
            {TABS.map((t) => {
              const count =
                t.value === "ALL"
                  ? summary?.totalCustomers
                  : summary?.byDebtStatus?.[t.value];
              return (
                <button
                  key={t.value}
                  onClick={() => {
                    setTab(t.value);
                    setPage(1);
                  }}
                  className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    tab === t.value
                      ? `border-brand ${t.tone}`
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  {count !== undefined && (
                    <span className="ml-1.5 text-xs opacity-70">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Tìm theo mã, tên, số điện thoại…"
                className="w-full border rounded pl-8 pr-3 py-1.5 text-sm"
              />
            </div>

            <select
              value={debtForm}
               onChange={(e) => {
                 setDebtForm(e.target.value as DebtForm | "");
                 setPage(1);
                 clearSelection();
               }}
              className="border rounded px-2.5 py-1.5 text-sm"
            >
              <option value="">Mọi hình thức công nợ</option>
              {(Object.keys(DEBT_FORM_LABELS) as DebtForm[]).map((p) => (
                <option key={p} value={p}>
                  {DEBT_FORM_LABELS[p]}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overLimitOnly}
                 onChange={(e) => {
                   setOverLimitOnly(e.target.checked);
                   setPage(1);
                   clearSelection();
                 }}
              />
              Vượt hạn mức
            </label>

            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withoutOpenTicket}
                 onChange={(e) => {
                   setWithoutOpenTicket(e.target.checked);
                   setPage(1);
                   clearSelection();
                 }}
              />
              Chưa có phiếu
            </label>

            {hasFilter && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            )}

            <div className="flex-1" />

            <Link
              href="/khach-hang/ticket-cong-no"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              <TicketIcon className="w-4 h-4" />
              Phiếu thu hồi nợ
            </Link>

            {canExport && (
              <button
                onClick={() => exportMut.mutate(params)}
                disabled={exportMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {exportMut.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Xuất Excel
              </button>
            )}

            {canCreateTicket && (
              <button
                onClick={() => setShowCreateTicket(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand text-white rounded hover:opacity-90"
              >
                <TicketIcon className="w-4 h-4" />
                Tạo phiếu
                {selectedRows.length > 0 && ` (${selectedRows.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Bảng */}
        <div className="flex-1 bg-white border rounded-lg overflow-hidden flex flex-col">
          <DebtTrackingTable
            params={params}
            selected={selected}
            onSelectedChange={handleSelectedChange}
            onSelectAll={handleSelectAll}
            selectAllPending={selectAllPending}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>
      </div>

      {showCreateTicket && (
        <CreateDebtTicketModal
          rows={selectedRows}
          onClose={() => setShowCreateTicket(false)}
          onCreated={() => setSelected([])}
        />
      )}
    </PagePermissionGuard>
  );
}

function SummaryCard({
  label,
  value,
  tone = "text-gray-800",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-white border rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-0.5 ${tone}`}>
        {value}
      </div>
    </div>
  );
}
