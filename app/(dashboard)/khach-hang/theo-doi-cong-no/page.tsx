"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Upload,
  Ticket as TicketIcon,
  RefreshCw,
  X,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { DebtTrackingTable } from "@/components/debt-tracking/DebtTrackingTable";
import { CreateDebtTicketModal } from "@/components/debt-tracking/CreateDebtTicketModal";
import { ImportDebtPolicyModal } from "@/components/debt-tracking/ImportDebtPolicyModal";
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
} from "@/lib/api/debt-tracking";

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

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
  const [selected, setSelected] = useState<number[]>([]);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const canCreateTicket = usePermission("debt_tickets", "create");
  const canExport = usePermission("debt_tracking", "export");
  const canImport = usePermission("debt_tracking", "update_policy");

  const params: DebtTrackingParams = useMemo(
    () => ({
      search: search || undefined,
      debtStatus: tab === "ALL" ? undefined : tab,
      debtForm: debtForm || undefined,
      overLimitOnly: overLimitOnly || undefined,
      withoutOpenTicket: withoutOpenTicket || undefined,
      page,
      pageSize: 30,
    }),
    [search, tab, debtForm, overLimitOnly, withoutOpenTicket, page]
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

  const selectedRows = useMemo(
    () => (listData?.data ?? []).filter((r) => selected.includes(r.customerId)),
    [listData, selected]
  );

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setDebtForm("");
    setOverLimitOnly(false);
    setWithoutOpenTicket(false);
    setTab("ALL");
    setPage(1);
  };

  const hasFilter =
    !!search || !!debtForm || overLimitOnly || withoutOpenTicket || tab !== "ALL";

  return (
    <PagePermissionGuard resource="debt_tracking" action="view">
      <div className="flex flex-col h-full p-4 gap-3">
        {/* Thẻ tổng hợp */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Khách đang theo dõi"
            value={summary ? String(summary.totalCustomers) : "—"}
          />
          <SummaryCard
            label="Tổng dư nợ"
            value={summary ? fmt(summary.totalDebt) : "—"}
          />
          <SummaryCard
            label="Nợ quá hạn"
            value={summary ? fmt(summary.overdueAmount) : "—"}
            tone="text-red-600"
          />
          <SummaryCard
            label="Vượt hạn mức"
            value={summary ? fmt(summary.overLimitAmount) : "—"}
            tone="text-orange-600"
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

            {canImport && (
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                title="Thiết lập công nợ hàng loạt từ file Excel"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
            )}

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
                disabled={selectedRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-40"
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
            onSelectedChange={setSelected}
            onPageChange={setPage}
          />
        </div>
      </div>

      {showCreateTicket && selectedRows.length > 0 && (
        <CreateDebtTicketModal
          rows={selectedRows}
          onClose={() => setShowCreateTicket(false)}
          onCreated={() => setSelected([])}
        />
      )}

      {showImport && (
        <ImportDebtPolicyModal onClose={() => setShowImport(false)} />
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
