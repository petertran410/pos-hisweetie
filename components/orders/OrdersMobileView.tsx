"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useOrders } from "@/lib/hooks/useOrders";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { OrdersMobileDetailSheet } from "./OrdersMobileDetailSheet";
import { CodeLink } from "../shared/CodeLink";
import {
  MobileFilterSheet,
  FilterSection,
  ChipGroup,
  SearchableChecklist,
  DateRangeFilter,
  dateInputToIsoStart,
  dateInputToIsoEnd,
  isoToDateInput,
  readMobileFilters,
  writeMobileFilters,
  type ChipOption,
} from "../shared/MobileFilters";

const STORAGE_KEY = "orders-mobile-filters";

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

const FILTER_STATUS_OPTIONS: ChipOption[] = [
  { value: "pending", label: "Phiếu tạm", dot: "bg-yellow-400" },
  { value: "confirmed", label: "Đã xác nhận", dot: "bg-teal-500" },
  { value: "processing", label: "Đang giao", dot: "bg-blue-500" },
  { value: "partially_invoiced", label: "Ra 1 phần HĐ", dot: "bg-teal-300" },
  { value: "completed", label: "Hoàn thành", dot: "bg-green-500" },
  { value: "cancelled", label: "Đã hủy", dot: "bg-red-400" },
];

const PAYMENT_METHOD_OPTIONS: ChipOption[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Ngân hàng" },
];

const DATE_PRESETS = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_week", label: "Tuần này" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_30_days", label: "30 ngày qua" },
];

// Các key chỉ phục vụ UI, KHÔNG được gửi lên backend (DTO không whitelist).
const UI_ONLY_FILTER_KEYS = [
  "_preset",
  "_dateMode",
  "_fromDate",
  "_toDate",
  "_customerLabel",
];

// Loại bỏ các key UI-only trước khi gọi API để tránh 400 (forbidNonWhitelisted).
const toApiFilters = (f: any) => {
  if (!f) return f;
  const clean = { ...f };
  for (const k of UI_ONLY_FILTER_KEYS) delete clean[k];
  return clean;
};

// Đếm số nhóm filter đang bật (để hiện badge). Mỗi nhóm tính 1.
const countActiveFilters = (f: any): number => {
  if (!f) return 0;
  let n = 0;
  if (Array.isArray(f.statuses) && f.statuses.length > 0) n++;
  if (Array.isArray(f.branchIds) && f.branchIds.length > 0) n++;
  if (f.customerId != null) n++;
  if (f.soldById != null) n++;
  if (f.paymentMethod) n++;
  if (f._preset || f.fromCreatedDate || f.toCreatedDate) n++;
  return n;
};

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
  // ── Dữ liệu cho các filter động ──
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b: any) => b.isActive),
    [branches]
  );
  const { data: users } = useUsersForFilter();
  const { data: bankAccounts } = useBankAccountsForPayment();

  // ── Local state ──
  const [statuses, setStatuses] = useState<string[]>(filters.statuses ?? []);
  const [branchIds, setBranchIds] = useState<string[]>(
    (filters.branchIds ?? []).map(String)
  );
  // Người bán (orders chỉ hỗ trợ 1 soldById)
  const [soldById, setSoldById] = useState<string>(
    filters.soldById != null ? String(filters.soldById) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    filters.paymentMethod || ""
  );
  const [bankAccountIds, setBankAccountIds] = useState<string[]>(
    (filters.bankAccountIds ?? []).map(String)
  );

  // Khách hàng (orders chỉ hỗ trợ 1 customerId)
  const [customerId, setCustomerId] = useState<number | null>(
    filters.customerId ?? null
  );
  const [customerLabel, setCustomerLabel] = useState<string>(
    filters._customerLabel || ""
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerQueryDebounced, setCustomerQueryDebounced] = useState("");
  const { data: customerSearchData } = useSearchCustomers(
    customerQueryDebounced || undefined
  );
  const customerResults = customerSearchData?.data || [];
  useEffect(() => {
    const t = setTimeout(() => setCustomerQueryDebounced(customerQuery), 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // Thời gian
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    filters._dateMode || "preset"
  );
  const [preset, setPreset] = useState<string>(filters._preset || "all_time");
  const [fromDate, setFromDate] = useState<string>(
    filters._fromDate || isoToDateInput(filters.fromCreatedDate)
  );
  const [toDate, setToDate] = useState<string>(
    filters._toDate || isoToDateInput(filters.toCreatedDate)
  );

  const handleApply = () => {
    const f: any = {
      pageSize: 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
    };

    if (statuses.length > 0) f.statuses = statuses;
    if (branchIds.length > 0) f.branchIds = branchIds.map(Number);
    if (soldById) f.soldById = Number(soldById);
    if (customerId != null) {
      f.customerId = customerId;
      f._customerLabel = customerLabel; // marker UI
    }
    if (paymentMethod) {
      f.paymentMethod = paymentMethod;
      if (paymentMethod === "transfer" && bankAccountIds.length > 0)
        f.bankAccountIds = bankAccountIds.map(Number);
    }

    if (dateMode === "preset" && preset && preset !== "all_time") {
      const range = getDateRangeFromPreset(preset);
      f._preset = preset;
      f.fromCreatedDate = range.from.toISOString();
      f.toCreatedDate = range.to.toISOString();
    } else if (dateMode === "custom" && (fromDate || toDate)) {
      f._dateMode = "custom";
      f._fromDate = fromDate;
      f._toDate = toDate;
      if (fromDate) f.fromCreatedDate = dateInputToIsoStart(fromDate);
      if (toDate) f.toCreatedDate = dateInputToIsoEnd(toDate);
    }

    onApply(f);
  };

  const handleReset = () => {
    setStatuses([]);
    setBranchIds([]);
    setSoldById("");
    setPaymentMethod("");
    setBankAccountIds([]);
    setCustomerId(null);
    setCustomerLabel("");
    setCustomerQuery("");
    setDateMode("preset");
    setPreset("all_time");
    setFromDate("");
    setToDate("");
  };

  const dateSummary =
    dateMode === "custom" && (fromDate || toDate)
      ? `${fromDate || "…"} → ${toDate || "…"}`
      : preset !== "all_time"
        ? DATE_PRESETS.find((p) => p.value === preset)?.label
        : undefined;

  const userOptions: ChipOption[] = (users ?? []).map((u: any) => ({
    value: String(u.id),
    label: u.name,
  }));
  const branchOptions: ChipOption[] = activeBranches.map((b: any) => ({
    value: String(b.id),
    label: b.name,
  }));

  const activeCount = [
    statuses.length > 0,
    branchIds.length > 0,
    customerId != null,
    !!soldById,
    !!paymentMethod,
    dateMode === "custom" ? !!(fromDate || toDate) : preset !== "all_time",
  ].filter(Boolean).length;

  return (
    <MobileFilterSheet
      title="Bộ lọc"
      activeCount={activeCount}
      onReset={handleReset}
      onApply={handleApply}
      onClose={onClose}>
      {/* Trạng thái */}
      <FilterSection
        label="Trạng thái đơn"
        defaultOpen
        summary={statuses.length > 0 ? `${statuses.length} đã chọn` : undefined}>
        <ChipGroup
          options={FILTER_STATUS_OPTIONS}
          values={statuses}
          onChange={setStatuses}
        />
      </FilterSection>

      {/* Thời gian */}
      <FilterSection label="Thời gian" defaultOpen summary={dateSummary}>
        <DateRangeFilter
          presets={DATE_PRESETS}
          mode={dateMode}
          preset={preset}
          fromDate={fromDate}
          toDate={toDate}
          onChange={(next) => {
            setDateMode(next.mode);
            setPreset(next.preset);
            setFromDate(next.fromDate);
            setToDate(next.toDate);
          }}
        />
      </FilterSection>

      {/* Chi nhánh */}
      <FilterSection
        label="Chi nhánh"
        summary={
          branchIds.length > 0 ? `${branchIds.length} đã chọn` : undefined
        }>
        <SearchableChecklist
          options={branchOptions}
          values={branchIds}
          searchPlaceholder="Tìm chi nhánh..."
          emptyText="Không có chi nhánh"
          onChange={setBranchIds}
        />
      </FilterSection>

      {/* Khách hàng */}
      <FilterSection
        label="Khách hàng"
        summary={customerId != null ? customerLabel : undefined}>
        {customerId != null ? (
          <div className="flex items-center justify-between gap-2 border border-blue-300 bg-blue-50 rounded-xl px-3 py-2.5">
            <span className="text-sm text-blue-700 font-medium truncate">
              {customerLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomerId(null);
                setCustomerLabel("");
                setCustomerQuery("");
              }}
              className="text-blue-400 hover:text-blue-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Tìm theo tên, SĐT, mã KH..."
                  className="w-full pl-8 pr-2 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {customerResults.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  {customerQuery ? "Không tìm thấy" : "Nhập để tìm khách hàng"}
                </div>
              ) : (
                customerResults.map((c: any, idx: number) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerLabel(c.name);
                      setCustomerQuery("");
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${
                      idx > 0 ? "border-t border-gray-50" : ""
                    }`}>
                    <div className="text-sm font-medium text-gray-800">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {c.code ? `Mã: ${c.code}` : "Chưa có mã"}
                      {c.contactNumber ? ` · ${c.contactNumber}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </FilterSection>

      {/* Người bán */}
      <FilterSection
        label="Người bán"
        summary={
          soldById
            ? userOptions.find((u) => u.value === soldById)?.label
            : undefined
        }>
        <SearchableChecklist
          options={userOptions}
          values={soldById ? [soldById] : []}
          searchPlaceholder="Tìm người bán..."
          emptyText="Không có nhân viên"
          onChange={(v) => setSoldById(v[v.length - 1] || "")}
        />
      </FilterSection>

      {/* Phương thức thanh toán */}
      <FilterSection
        label="Phương thức thanh toán"
        summary={
          PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label
        }>
        <div className="space-y-3">
          <ChipGroup
            options={PAYMENT_METHOD_OPTIONS}
            values={paymentMethod ? [paymentMethod] : []}
            multiple={false}
            onChange={(v) => {
              setPaymentMethod(v[0] || "");
              setBankAccountIds([]);
            }}
          />
          {paymentMethod === "transfer" && (
            <SearchableChecklist
              options={(Array.isArray(bankAccounts) ? bankAccounts : []).map(
                (a: any) => ({
                  value: String(a.id),
                  label: `${a.bankCode || a.bankName || ""} · ${a.accountNumber || ""}`,
                })
              )}
              values={bankAccountIds}
              searchPlaceholder="Tìm tài khoản..."
              emptyText="Không có tài khoản"
              onChange={setBankAccountIds}
            />
          )}
        </div>
      </FilterSection>
    </MobileFilterSheet>
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

  // ── Filter của riêng mobile (khôi phục từ localStorage) ──
  // Nguồn sự thật cho query, không bám `filters` prop (sidebar desktop vẫn mount
  // ẩn có thể ghi đè prop sau ~300ms).
  const [localFilters, setLocalFilters] = useState<any>(
    () => readMobileFilters(STORAGE_KEY) ?? filters ?? {}
  );
  const [search, setSearch] = useState(
    () => filters?.search ?? localFilters?.search ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const limit = 20;

  // Lưu lại filter mỗi khi đổi
  useEffect(() => {
    writeMobileFilters(STORAGE_KEY, localFilters);
  }, [localFilters]);

  const applyFilters = (f: any) => {
    setLocalFilters(f);
    onFiltersChange?.(f);
  };

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter / search / tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, localFilters, activeTab]);

  const apiFilters = toApiFilters(localFilters);

  // Tab nhanh ghi đè trạng thái — chỉ khi sheet không lọc đa trạng thái.
  const effectiveFilters = {
    ...apiFilters,
    ...(activeTab !== "all" &&
    (!apiFilters.statuses || apiFilters.statuses.length === 0)
      ? { statuses: [activeTab] }
      : {}),
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
        apiFilters,
      ],
      queryFn: () =>
        ordersApi.getOrders({
          limit: 1,
          page: 1,
          branchId: selectedBranch?.id,
          ...apiFilters,
          ...(tab.apiStatus ? { statuses: [tab.apiStatus] } : {}),
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

  const activeFilterCount = countActiveFilters(localFilters);

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
                  onClick={() => setPage(1)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
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
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronsRight className="w-4 h-4" />
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
          filters={localFilters}
          onApply={(f) => {
            applyFilters(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
