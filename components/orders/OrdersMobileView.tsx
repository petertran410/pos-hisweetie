"use client";

import { useState, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { useOrders } from "@/lib/hooks/useOrders";
import { useBranchStore } from "@/lib/store/branch";
import { ordersApi } from "@/lib/api/orders";
import { formatCurrency, formatDate, getDateRangeFromPreset } from "@/lib/utils";
import type { Order } from "@/lib/types/order";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { OrdersMobileDetailSheet } from "./OrdersMobileDetailSheet";
import { CodeLink } from "../shared/CodeLink";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Đang giao",
  3: "Hoàn thành",
  4: "Đã hủy",
  5: "Đã xác nhận",
  6: "Ra 1 phần HĐ",
};

const STATUS_DOT: Record<number, string> = {
  1: "bg-yellow-400",
  2: "bg-blue-500",
  3: "bg-green-500",
  4: "bg-red-400",
  5: "bg-teal-500",
  6: "bg-teal-300",
};

const MOBILE_STATUS_TABS = [
  { value: "all", label: "Tất cả", apiStatus: undefined },
  { value: "pending", label: "Phiếu tạm", apiStatus: "pending" },
  { value: "confirmed", label: "Đã xác nhận", apiStatus: "confirmed" },
  { value: "processing", label: "Đang giao", apiStatus: "processing" },
  { value: "completed", label: "Hoàn thành", apiStatus: "completed" },
  { value: "cancelled", label: "Đã hủy", apiStatus: "cancelled" },
] as const;

const FILTER_STATUS_OPTIONS = [
  { value: "pending", label: "Phiếu tạm" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang giao" },
  { value: "partially_invoiced", label: "Ra 1 phần HĐ" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

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
  "status",
  "customerId",
  "branchId",
  "_preset",
  "paymentStatus",
];

// ─── OrderMobileCard ──────────────────────────────────────────────────────────
function OrderMobileCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const paid = Number(order.paidAmount);
  const debt = Number(order.debtAmount);
  const total = Number(order.grandTotal);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none">
      {/* Row 1: code + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-blue-600 font-bold text-[15px]">
          <CodeLink entity="order" code={order.code} />
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[order.status] || "bg-gray-400"}`}
          />
          <span className="text-sm text-gray-500 font-medium">
            {STATUS_TEXT[order.status] || "—"}
          </span>
        </div>
      </div>

      {/* Row 2: customer name */}
      <p className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">
        {order.customer?.name || "Khách vãng lai"}
      </p>

      {/* Row 3: date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3.5">
        <Calendar className="w-3.5 h-3.5" />
        <span>{formatDate(order.orderDate)}</span>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 mb-3.5" />

      {/* Row 4: payment summary */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          {paid > 0 && (
            <div>
              <p className="text-xs text-gray-400 leading-none mb-0.5">
                Đã thu
              </p>
              <p className="text-sm font-semibold text-green-600 leading-none">
                {formatCurrency(paid)}
              </p>
            </div>
          )}
          {paid === 0 && (
            <div>
              <p className="text-xs text-gray-400 leading-none mb-0.5">
                Đã thu
              </p>
              <p className="text-sm font-semibold text-gray-400 leading-none">
                0 đ
              </p>
            </div>
          )}
          {debt > 0 && (
            <div>
              <p className="text-xs text-gray-400 leading-none mb-0.5">
                Còn nợ
              </p>
              <p className="text-sm font-semibold text-orange-500 leading-none">
                {formatCurrency(debt)}
              </p>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 leading-none mb-0.5">Tổng</p>
          <p className="text-base font-bold text-gray-900 leading-none">
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── OrdersMobileFilterSheet ──────────────────────────────────────────────────
function OrdersMobileFilterSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: any;
  onApply: (f: any) => void;
  onClose: () => void;
}) {
  const [localStatus, setLocalStatus] = useState<string>(filters.status || "");
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
    if (localStatus) newFilters.status = localStatus;
    if (localPreset && localPreset !== "all_time") {
      // _preset chỉ là marker UI; gửi lên backend bằng fromCreatedDate/toCreatedDate.
      const range = getDateRangeFromPreset(localPreset);
      newFilters._preset = localPreset;
      newFilters.fromCreatedDate = range.from.toISOString();
      newFilters.toCreatedDate = range.to.toISOString();
    }
    onApply(newFilters);
  };

  const handleReset = () => {
    setLocalStatus("");
    setLocalPreset("all_time");
  };

  const activeCount = [
    localStatus,
    localPreset !== "all_time" ? localPreset : "",
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Bộ lọc</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                Xóa tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Trạng thái
            </p>
            <div className="flex flex-wrap gap-2">
              {FILTER_STATUS_OPTIONS.map((opt) => {
                const isActive = localStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLocalStatus(isActive ? "" : opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date preset */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Thời gian đặt hàng
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((opt) => {
                const isActive = localPreset === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLocalPreset(opt.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleApply}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OrdersMobileView (main export) ──────────────────────────────────────────
interface OrdersMobileViewProps {
  filters: any;
  onFiltersChange: (f: any) => void;
  onCreateClick: () => void;
}

export function OrdersMobileView({
  filters,
  onFiltersChange,
  onCreateClick,
}: OrdersMobileViewProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
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
    ...(activeTab !== "all" ? { status: activeTab } : {}),
  };

  const { data, isLoading } = useOrders({
    page,
    limit,
    search: debouncedSearch,
    branchId: selectedBranch?.id,
    ...effectiveFilters,
  });

  // Count per status tab — parallel, staleTime 30s để tránh spam API
  const statusCountResults = useQueries({
    queries: MOBILE_STATUS_TABS.map((tab) => ({
      queryKey: [
        "orders",
        "count-mobile",
        tab.apiStatus,
        selectedBranch?.id,
        filters,
      ],
      queryFn: () =>
        ordersApi.getOrders({
          limit: 1,
          page: 1,
          branchId: selectedBranch?.id,
          ...filters,
          ...(tab.apiStatus ? { status: tab.apiStatus } : {}),
        }),
      staleTime: 30_000,
    })),
  });

  const counts = MOBILE_STATUS_TABS.reduce(
    (acc, tab, i) => {
      acc[tab.value] = statusCountResults[i].data?.total ?? 0;
      return acc;
    },
    {} as Record<string, number>
  );

  const orders = data?.data ?? [];
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
              placeholder="Tìm mã đơn, khách hàng..."
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
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-0.5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Status tabs — horizontal scroll, no scrollbar */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {MOBILE_STATUS_TABS.map((tab) => {
            const count = counts[tab.value];
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {tab.label}
                {count != null && count > 0 && (
                  <span
                    className={`ml-1 text-xs ${isActive ? "text-blue-100" : "text-gray-400"}`}>
                    ({count})
                  </span>
                )}
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
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-gray-400 text-sm">
              Không có đơn đặt hàng nào
            </span>
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <OrderMobileCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrderId(order.id)}
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

      {/* ─── FAB ─── */}
      <button
        onClick={onCreateClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* ─── Detail bottom sheet ─── */}
      {selectedOrderId !== null && (
        <OrdersMobileDetailSheet
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* ─── Filter bottom sheet ─── */}
      {showFilter && (
        <OrdersMobileFilterSheet
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
