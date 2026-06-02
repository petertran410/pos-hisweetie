"use client";

import { useState, useEffect } from "react";
import { useInvoicesVat } from "@/lib/hooks/useInvoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceVat } from "@/lib/api/invoices";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
} from "lucide-react";
import { InvoicesMobileDetailSheet } from "@/components/invoices/InvoicesMobileDetailSheet";

// ─── Constants ────────────────────────────────────────────────────────────────
type MisaStatus = "PENDING" | "SYNCED" | "FAILED" | "SKIP";

const MISA_STATUS_META: Record<
  MisaStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  SYNCED: {
    label: "Đã đồng bộ",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  FAILED: {
    label: "Thất bại",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  PENDING: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-700",
    Icon: Clock,
  },
  SKIP: {
    label: "Bỏ qua",
    className: "bg-gray-100 text-gray-600",
    Icon: MinusCircle,
  },
};

const MISA_STATUS_TABS = [
  { value: "all", label: "Tất cả", apiStatus: undefined },
  { value: "PENDING", label: "Chờ xử lý", apiStatus: "PENDING" },
  { value: "SYNCED", label: "Đã đồng bộ", apiStatus: "SYNCED" },
  { value: "FAILED", label: "Thất bại", apiStatus: "FAILED" },
  { value: "SKIP", label: "Bỏ qua", apiStatus: "SKIP" },
] as const;

const DATE_PRESETS = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_week", label: "Tuần này" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_30_days", label: "30 ngày qua" },
  { value: "all_time", label: "Toàn thời gian" },
];

const ACTIVE_FILTER_KEYS = [
  "statusIds",
  "customerId",
  "branchId",
  "fromDate",
  "toDate",
];

function MisaStatusBadge({ status }: { status?: MisaStatus }) {
  const meta = MISA_STATUS_META[status ?? "SKIP"];
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

// ─── InvoiceVatMobileCard ─────────────────────────────────────────────────────
function InvoiceVatMobileCard({
  invoice,
  onClick,
}: {
  invoice: InvoiceVat;
  onClick: () => void;
}) {
  const preTax = Number(invoice.vat?.totalPreTax || 0);
  const vat = Number(invoice.vat?.totalVat || 0);
  const afterTax = Number(invoice.vat?.totalAfterTax || 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none">
      {/* Row 1: code + misa status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-blue-600 font-bold text-[15px]">
          {invoice.code}
        </span>
        <MisaStatusBadge status={invoice.misaSyncStatus} />
      </div>

      {/* Row 2: customer name */}
      <p className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">
        {invoice.customer?.name || "Khách vãng lai"}
      </p>

      {/* Row 3: date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3.5">
        <Calendar className="w-3.5 h-3.5" />
        <span>{formatDate(invoice.purchaseDate)}</span>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 mb-3.5" />

      {/* Row 4: VAT summary */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">
              Tiền trước thuế
            </p>
            <p className="text-sm font-semibold text-gray-700 leading-none">
              {formatCurrency(preTax)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">
              Thuế VAT 8%
            </p>
            <p className="text-sm font-semibold text-blue-600 leading-none">
              {formatCurrency(vat)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 leading-none mb-0.5">Sau thuế</p>
          <p className="text-base font-bold text-gray-900 leading-none">
            {formatCurrency(afterTax)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── HoaDonVatMobileFilterSheet ───────────────────────────────────────────────
function HoaDonVatMobileFilterSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: any;
  onApply: (f: any) => void;
  onClose: () => void;
}) {
  const [localPreset, setLocalPreset] = useState<string>(
    filters._preset || "all_time"
  );

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleApply = () => {
    const newFilters: any = {
      pageSize: 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
    };
    if (localPreset && localPreset !== "all_time")
      newFilters._preset = localPreset;
    onApply(newFilters);
  };

  const handleReset = () => {
    setLocalPreset("all_time");
  };

  const activeCount = [localPreset !== "all_time" ? localPreset : ""].filter(
    Boolean
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Bộ lọc</h3>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Date preset */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Khoảng thời gian
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setLocalPreset(preset.value)}
                  className={`px-3 py-2.5 text-sm rounded-xl border transition-colors ${
                    localPreset === preset.value
                      ? "border-blue-600 bg-blue-50 text-blue-600 font-medium"
                      : "border-gray-200 text-gray-600"
                  }`}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t">
          <button
            onClick={handleReset}
            className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl">
            Đặt lại
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl">
            Áp dụng{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HoaDonVatMobileView (main export) ────────────────────────────────────────
interface HoaDonVatMobileViewProps {
  filters: any;
  onFiltersChange: (f: any) => void;
}

export function HoaDonVatMobileView({
  filters,
  onFiltersChange,
}: HoaDonVatMobileViewProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [showFilter, setShowFilter] = useState(false);
  const limit = 20;

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter / search / tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeTab]);

  const effectiveFilters = {
    ...filters,
    ...(activeTab !== "all" ? { misaSyncStatus: [activeTab] } : {}),
  };

  const { data, isLoading } = useInvoicesVat({
    page,
    limit,
    search: debouncedSearch,
    ...effectiveFilters,
  });

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const activeFilterCount = ACTIVE_FILTER_KEYS.filter(
    (k) => filters[k] != null
  ).length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ─── Header: search + filter icon ─── */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã hóa đơn, khách hàng..."
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(true)}
            className={`relative p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              activeFilterCount > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-100 hover:bg-gray-200"
            }`}>
            <SlidersHorizontal
              className={`w-5 h-5 ${activeFilterCount > 0 ? "text-white" : "text-gray-600"}`}
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Misa status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide -mx-4 px-4">
          {MISA_STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium rounded-t-xl border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-gray-400 text-sm">Không có hóa đơn nào</span>
          </div>
        ) : (
          <>
            {invoices.map((invoice) => (
              <InvoiceVatMobileCard
                key={invoice.id}
                invoice={invoice}
                onClick={() => setSelectedInvoiceId(invoice.id)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Detail bottom sheet ─── */}
      {selectedInvoiceId !== null && (
        <InvoicesMobileDetailSheet
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* ─── Filter bottom sheet ─── */}
      {showFilter && (
        <HoaDonVatMobileFilterSheet
          filters={filters}
          onApply={(f) => {
            onFiltersChange(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
