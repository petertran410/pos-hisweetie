"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { DebtTrackingTable } from "@/components/debt-tracking/DebtTrackingTable";
import {
  useDebtTrackingSummary,
  useExportDebtTracking,
  useNotifySaleDebt,
} from "@/lib/hooks/useDebtTracking";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  DebtStatus,
  DebtForm,
  DebtTrackingParams,
  DEBT_FORM_LABELS,
} from "@/lib/api/debt-tracking";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { FilterMultiSelect } from "@/components/ui/filters";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
  const [salePicIds, setSalePicIds] = useState<number[]>([]);
  const [customerGroupIds, setCustomerGroupIds] = useState<number[]>([]);
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [withoutOpenTicket, setWithoutOpenTicket] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const canExport = usePermission("debt_tracking", "export");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [notifyIssues, setNotifyIssues] = useState<string[]>([]);
  const notifySaleDebt = useNotifySaleDebt();
  const { data: usersForPic } = useUsersForFilter();
  const { data: customerGroupsRes } = useCustomerGroups();
  const customerGroups = customerGroupsRes?.data ?? [];

  const params: DebtTrackingParams = useMemo(
    () => ({
      search: search || undefined,
      debtStatus: tab === "ALL" ? undefined : tab,
      debtForm: debtForm || undefined,
      salePicIds: salePicIds.length ? salePicIds : undefined,
      customerGroupIds: customerGroupIds.length ? customerGroupIds : undefined,
      overLimitOnly: overLimitOnly || undefined,
      withoutOpenTicket: withoutOpenTicket || undefined,
      page,
      pageSize,
    }),
    [search, tab, debtForm, salePicIds, customerGroupIds, overLimitOnly, withoutOpenTicket, page, pageSize]
  );

  // Summary dùng chung filter nhưng bỏ debtStatus để luôn thấy bức tranh
  // tổng thể của tập đang lọc.
  const summaryParams = useMemo(
    () => ({ ...params, debtStatus: undefined, page: 1 }),
    [params]
  );

  const { data: summary } = useDebtTrackingSummary(summaryParams);
  const exportMut = useExportDebtTracking();

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setDebtForm("");
    setSalePicIds([]);
    setCustomerGroupIds([]);
    setOverLimitOnly(false);
    setWithoutOpenTicket(false);
    setTab("ALL");
    setPage(1);
  };

  const hasFilter =
    !!search ||
    !!debtForm ||
    salePicIds.length > 0 ||
    customerGroupIds.length > 0 ||
    overLimitOnly ||
    withoutOpenTicket ||
    tab !== "ALL";

  const handleNotifySaleDebt = () => {
    if (selectedCustomerIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một khách hàng");
      return;
    }
    setNotifyIssues([]);
    notifySaleDebt.mutate(selectedCustomerIds, {
      onSuccess: (result) => {
        const sentIds = result.results
          .filter((item) => item.status === "SENT")
          .map((item) => item.customerId);
        setSelectedCustomerIds((current) =>
          current.filter((id) => !sentIds.includes(id)),
        );
        setNotifyIssues(
          result.results
            .filter((item) => item.status !== "SENT")
            .map(
              (item) =>
                `${item.customerName}: ${item.message || "Không gửi được"}`,
            ),
        );
        const failures = result.results.filter((item) => item.status !== "SENT");
        if (failures.length > 0) {
          toast.error(
            failures
              .map(
                (item) =>
                  `${item.customerName}: ${item.message || "Không gửi được"}`,
              )
              .join("\n"),
          );
        }
      },
    });
  };

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
            label="Đang ngừng đi hàng"
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

            <div className="w-[220px] shrink-0">
              <FilterMultiSelect
                options={(usersForPic ?? []).map((user) => ({
                  value: String(user.id),
                  label: user.name,
                }))}
                values={salePicIds.map(String)}
                onChange={(vals) => {
                  setSalePicIds(vals.map(Number));
                  setPage(1);
                }}
                placeholder="Tất cả Sale PIC"
                searchPlaceholder="Tìm Sale PIC..."
                multiLabel={(n) => `${n} Sale PIC`}
              />
            </div>

            <div className="w-[240px] shrink-0">
              <FilterMultiSelect
                options={customerGroups.map((group) => ({
                  value: String(group.id),
                  label: group.name,
                }))}
                values={customerGroupIds.map(String)}
                onChange={(vals) => {
                  setCustomerGroupIds(vals.map(Number));
                  setPage(1);
                }}
                placeholder="Tất cả nhóm KH"
                searchPlaceholder="Tìm nhóm khách hàng..."
                multiLabel={(n) => `${n} nhóm KH`}
              />
            </div>

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

            <button
              onClick={handleNotifySaleDebt}
              disabled={notifySaleDebt.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {notifySaleDebt.isPending && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              Gửi nhắc Sale PIC
              {selectedCustomerIds.length > 0 &&
                ` (${selectedCustomerIds.length})`}
            </button>

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

          </div>
        </div>

        {/* Bảng */}
        <div className="flex-1 bg-white border rounded-lg overflow-hidden flex flex-col">
          <DebtTrackingTable
            params={params}
            selectedCustomerIds={selectedCustomerIds}
            onSelectedCustomerIdsChange={setSelectedCustomerIds}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>
        {notifyIssues.length > 0 && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="font-medium">Một số khách chưa gửi được:</div>
            <ul className="mt-1 list-disc pl-5">
              {notifyIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
