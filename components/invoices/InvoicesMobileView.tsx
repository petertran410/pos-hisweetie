"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useBranchStore } from "@/lib/store/branch";
import { invoicesApi } from "@/lib/api/invoices";
import { formatCurrency, formatDate, getDateRangeFromPreset } from "@/lib/utils";
import type { Invoice } from "@/lib/types/invoice";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { InvoicesMobileDetailSheet } from "./InvoicesMobileDetailSheet";
import { CodeLink } from "../shared/CodeLink";
import { useInvoicePriceBookWarnings } from "@/lib/hooks/useInvoicePriceBookWarnings";
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

const STORAGE_KEY = "invoices-mobile-filters";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TEXT: Record<number, string> = {
  1: "Hoàn thành",
  2: "Đã hủy",
  3: "Đang xử lý",
  4: "Không giao được",
  5: "Đóng hàng",
  6: "Đang giao hàng",
  7: "Giao thành công",
  8: "Trả hàng",
};

const STATUS_DOT: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-red-400",
  3: "bg-blue-500",
  4: "bg-yellow-400",
  5: "bg-orange-400",
  6: "bg-purple-500",
  7: "bg-teal-500",
  8: "bg-pink-400",
};

const MOBILE_STATUS_TABS = [
  { value: "all", label: "Tất cả", apiStatus: undefined },
  { value: "3", label: "Đang xử lý", apiStatus: "3" },
  { value: "5", label: "Đóng hàng", apiStatus: "5" },
  { value: "6", label: "Đang giao hàng", apiStatus: "6" },
  { value: "7", label: "Giao thành công", apiStatus: "7" },
  { value: "1", label: "Hoàn thành", apiStatus: "1" },
  { value: "4", label: "Không giao được", apiStatus: "4" },
  { value: "8", label: "Trả hàng", apiStatus: "8" },
  { value: "2", label: "Đã hủy", apiStatus: "2" },
] as const;

const FILTER_STATUS_OPTIONS: ChipOption[] = [
  { value: "3", label: "Đang xử lý", dot: "bg-blue-400" },
  { value: "5", label: "Đóng hàng", dot: "bg-orange-400" },
  { value: "6", label: "Đang giao hàng", dot: "bg-purple-400" },
  { value: "7", label: "Giao thành công", dot: "bg-teal-500" },
  { value: "1", label: "Hoàn thành", dot: "bg-green-500" },
  { value: "4", label: "Không giao được", dot: "bg-yellow-400" },
  { value: "8", label: "Trả hàng", dot: "bg-pink-400" },
  { value: "2", label: "Đã hủy", dot: "bg-red-400" },
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
const UI_ONLY_FILTER_KEYS = ["_preset", "_dateMode", "_fromDate", "_toDate"];

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
  if (Array.isArray(f.statusIds) && f.statusIds.length > 0) n++;
  if (Array.isArray(f.branchIds) && f.branchIds.length > 0) n++;
  if (Array.isArray(f.customerIds) && f.customerIds.length > 0) n++;
  if (Array.isArray(f.createdByIds) && f.createdByIds.length > 0) n++;
  if (Array.isArray(f.soldByIds) && f.soldByIds.length > 0) n++;
  if (f.paymentMethod) n++;
  if (f._preset || f.fromCreatedDate || f.toCreatedDate) n++;
  return n;
};

// ─── InvoiceMobileCard ────────────────────────────────────────────────────────
function InvoiceMobileCard({
  invoice,
  onClick,
  hasWarning,
}: {
  invoice: Invoice;
  onClick: () => void;
  hasWarning?: boolean;
}) {
  const paid = Number(invoice.paidAmount);
  const debt = Number(invoice.debtAmount);
  const total = Number(invoice.grandTotal);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform select-none border ${
        hasWarning ? "border-2 border-yellow-400" : "border-gray-100"
      }`}>
      {/* Row 1: code + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-blue-600 font-bold text-[15px] flex items-center gap-1.5">
          {hasWarning && (
            <AlertTriangle className="w-4 h-4 text-yellow-500 fill-yellow-100 flex-shrink-0" />
          )}
          <CodeLink entity="invoice" code={invoice.code} />
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[invoice.status] || "bg-gray-400"}`}
          />
          <span className="text-sm text-gray-500 font-medium">
            {STATUS_TEXT[invoice.status] || "—"}
          </span>
        </div>
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

      {/* Row 4: payment summary */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">Đã thu</p>
            <p
              className={`text-sm font-semibold leading-none ${paid > 0 ? "text-green-600" : "text-gray-400"}`}>
              {paid > 0 ? formatCurrency(paid) : "0 đ"}
            </p>
          </div>
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

// ─── InvoicesMobileFilterSheet ────────────────────────────────────────────────
function InvoicesMobileFilterSheet({
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

  // ── Local state (mirror filters hiện tại) ──
  const [statusIds, setStatusIds] = useState<string[]>(
    (filters.statusIds ?? []).map(String)
  );
  const [branchIds, setBranchIds] = useState<string[]>(
    (filters.branchIds ?? []).map(String)
  );
  const [createdByIds, setCreatedByIds] = useState<string[]>(
    (filters.createdByIds ?? []).map(String)
  );
  const [soldByIds, setSoldByIds] = useState<string[]>(
    (filters.soldByIds ?? []).map(String)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    filters.paymentMethod || ""
  );
  const [bankAccountIds, setBankAccountIds] = useState<string[]>(
    (filters.bankAccountIds ?? []).map(String)
  );

  // Khách hàng: tìm theo tên/SĐT/mã (autocomplete)
  const [customerIds, setCustomerIds] = useState<number[]>(
    filters.customerIds ?? []
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

  // Thời gian: preset hoặc tùy chọn ngày cụ thể
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    filters._dateMode || (filters._preset ? "preset" : "preset")
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

    if (statusIds.length > 0) f.statusIds = statusIds.map(Number);
    if (branchIds.length > 0) f.branchIds = branchIds.map(Number);
    if (createdByIds.length > 0) f.createdByIds = createdByIds.map(Number);
    if (soldByIds.length > 0) f.soldByIds = soldByIds.map(Number);
    if (customerIds.length > 0) {
      f.customerIds = customerIds;
      f._customerLabel = customerLabel; // marker UI, không gửi backend
    }
    if (paymentMethod) {
      f.paymentMethod = paymentMethod;
      if (paymentMethod === "transfer" && bankAccountIds.length > 0)
        f.bankAccountIds = bankAccountIds.map(Number);
    }

    // Thời gian → fromCreatedDate/toCreatedDate (giống desktop)
    if (dateMode === "preset" && preset && preset !== "all_time") {
      const range = getDateRangeFromPreset(preset);
      f._preset = preset; // marker UI
      f.fromCreatedDate = range.from.toISOString();
      f.toCreatedDate = range.to.toISOString();
    } else if (dateMode === "custom" && (fromDate || toDate)) {
      f._dateMode = "custom"; // marker UI
      f._fromDate = fromDate;
      f._toDate = toDate;
      if (fromDate) f.fromCreatedDate = dateInputToIsoStart(fromDate);
      if (toDate) f.toCreatedDate = dateInputToIsoEnd(toDate);
    }

    onApply(f);
  };

  const handleReset = () => {
    setStatusIds([]);
    setBranchIds([]);
    setCreatedByIds([]);
    setSoldByIds([]);
    setPaymentMethod("");
    setBankAccountIds([]);
    setCustomerIds([]);
    setCustomerLabel("");
    setCustomerQuery("");
    setDateMode("preset");
    setPreset("all_time");
    setFromDate("");
    setToDate("");
  };

  // Summary cho header accordion
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
    statusIds.length > 0,
    branchIds.length > 0,
    customerIds.length > 0,
    createdByIds.length > 0,
    soldByIds.length > 0,
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
        label="Trạng thái hóa đơn"
        defaultOpen
        summary={
          statusIds.length > 0 ? `${statusIds.length} đã chọn` : undefined
        }>
        <ChipGroup
          options={FILTER_STATUS_OPTIONS}
          values={statusIds}
          onChange={setStatusIds}
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
        summary={customerIds.length > 0 ? customerLabel : undefined}>
        {customerIds.length > 0 ? (
          <div className="flex items-center justify-between gap-2 border border-blue-300 bg-blue-50 rounded-xl px-3 py-2.5">
            <span className="text-sm text-blue-700 font-medium truncate">
              {customerLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomerIds([]);
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
                      setCustomerIds([c.id]);
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

      {/* Người tạo */}
      <FilterSection
        label="Người tạo"
        summary={
          createdByIds.length > 0 ? `${createdByIds.length} đã chọn` : undefined
        }>
        <SearchableChecklist
          options={userOptions}
          values={createdByIds}
          searchPlaceholder="Tìm người tạo..."
          emptyText="Không có nhân viên"
          onChange={setCreatedByIds}
        />
      </FilterSection>

      {/* Người bán */}
      <FilterSection
        label="Người bán"
        summary={
          soldByIds.length > 0 ? `${soldByIds.length} đã chọn` : undefined
        }>
        <SearchableChecklist
          options={userOptions}
          values={soldByIds}
          searchPlaceholder="Tìm người bán..."
          emptyText="Không có nhân viên"
          onChange={setSoldByIds}
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

// ─── InvoicesMobileView (main export) ────────────────────────────────────────
interface InvoicesMobileViewProps {
  filters: any;
  onFiltersChange: (f: any) => void;
  onCreateClick: () => void;
}

export function InvoicesMobileView({
  filters,
  onFiltersChange,
  onCreateClick,
}: InvoicesMobileViewProps) {
  const { selectedBranch } = useBranchStore();

  // ── Filter của riêng mobile (khôi phục từ localStorage) ──
  // Dùng làm nguồn sự thật cho query, KHÔNG bám `filters` prop vì sidebar desktop
  // (vẫn mount ẩn) có thể ghi đè prop này sau ~300ms.
  const [localFilters, setLocalFilters] = useState<any>(
    () => readMobileFilters(STORAGE_KEY) ?? filters ?? {}
  );

  // Nếu page truyền search từ deep-link (?Code=...) thì ưu tiên áp vào.
  const [search, setSearch] = useState(
    () => filters?.search ?? localFilters?.search ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [showFilter, setShowFilter] = useState(false);
  const limit = 20;

  // Lưu lại filter mỗi khi đổi
  useEffect(() => {
    writeMobileFilters(STORAGE_KEY, localFilters);
  }, [localFilters]);

  // Áp filter từ sheet: cập nhật local + đẩy lên page (giữ tương thích)
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

  const effectiveFilters = {
    ...apiFilters,
    ...(activeTab !== "all" ? { statusIds: [Number(activeTab)] } : {}),
  };

  const { data, isLoading } = useInvoices({
    page,
    limit,
    search: debouncedSearch,
    ...effectiveFilters,
  });

  // Count per status tab — staleTime 30s
  const statusCountResults = useQueries({
    queries: MOBILE_STATUS_TABS.map((tab) => ({
      queryKey: [
        "invoices",
        "count-mobile",
        tab.apiStatus,
        selectedBranch?.id,
        apiFilters,
      ],
      queryFn: () =>
        invoicesApi.getInvoices({
          limit: 1,
          page: 1,
          ...apiFilters,
          ...(tab.apiStatus ? { statusIds: [Number(tab.apiStatus)] } : {}),
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

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Hóa đơn (bảng giá 2/3) có giá thực bán thấp hơn giá niêm yết → cảnh báo.
  const priceWarningIds = useInvoicePriceBookWarnings(invoices);

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

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide -mx-4 px-4">
          {MOBILE_STATUS_TABS.map((tab) => {
            const count = counts[tab.value] ?? 0;
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
                {count > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-bold ${
                      isActive ? "text-blue-400" : "text-gray-400"
                    }`}>
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
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-gray-400 text-sm">Không có hóa đơn nào</span>
          </div>
        ) : (
          <>
            {invoices.map((invoice) => (
              <InvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                hasWarning={priceWarningIds.has(invoice.id)}
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

      {/* ─── FAB ─── */}
      <button
        onClick={onCreateClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* ─── Detail bottom sheet ─── */}
      {selectedInvoiceId !== null && (
        <InvoicesMobileDetailSheet
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* ─── Filter bottom sheet ─── */}
      {showFilter && (
        <InvoicesMobileFilterSheet
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
