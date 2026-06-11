"use client";

import { useState, useEffect, useMemo } from "react";
import { useInvoicesVat } from "@/lib/hooks/useInvoices";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useMisaEmployees } from "@/lib/hooks/useMisa";
import { formatCurrency, formatDate, getDateRangeFromPreset } from "@/lib/utils";
import type { InvoiceVat } from "@/lib/api/invoices";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
} from "lucide-react";
import { InvoicesMobileDetailSheet } from "@/components/invoices/InvoicesMobileDetailSheet";
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
} from "@/components/shared/MobileFilters";

const STORAGE_KEY = "invoices-vat-mobile-filters";

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
];

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

const MISA_FILTER_OPTIONS: ChipOption[] = [
  { value: "PENDING", label: "Chờ xử lý", dot: "bg-yellow-400" },
  { value: "SYNCED", label: "Đã đồng bộ", dot: "bg-green-500" },
  { value: "FAILED", label: "Thất bại", dot: "bg-red-400" },
  { value: "SKIP", label: "Bỏ qua", dot: "bg-gray-400" },
];

const PAYMENT_METHOD_OPTIONS: ChipOption[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Ngân hàng" },
];

// Các key chỉ phục vụ UI, KHÔNG được gửi lên backend (DTO không whitelist).
const UI_ONLY_FILTER_KEYS = [
  "_preset",
  "_dateMode",
  "_fromDate",
  "_toDate",
  "_updatedPreset",
  "_updatedDateMode",
  "_updatedFromDate",
  "_updatedToDate",
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
  if (Array.isArray(f.statusIds) && f.statusIds.length > 0) n++;
  if (Array.isArray(f.misaSyncStatus) && f.misaSyncStatus.length > 0) n++;
  if (Array.isArray(f.misaEmployeeCodes) && f.misaEmployeeCodes.length > 0) n++;
  if (f.taxCodeStatus) n++;
  if (Array.isArray(f.branchIds) && f.branchIds.length > 0) n++;
  if (Array.isArray(f.customerIds) && f.customerIds.length > 0) n++;
  if (Array.isArray(f.createdByIds) && f.createdByIds.length > 0) n++;
  if (Array.isArray(f.soldByIds) && f.soldByIds.length > 0) n++;
  if (f.paymentMethod) n++;
  if (f._preset || f.fromCreatedDate || f.toCreatedDate) n++;
  if (f._updatedPreset || f.fromUpdatedDate || f.toUpdatedDate) n++;
  return n;
};

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
        <span className="text-brand font-bold text-[15px]">
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
              Thuế VAT
            </p>
            <p className="text-sm font-semibold text-brand leading-none">
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
  // ── Dữ liệu cho các filter động ──
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b: any) => b.isActive),
    [branches]
  );
  const { data: users } = useUsersForFilter();
  const { data: bankAccounts } = useBankAccountsForPayment();
  const { data: misaEmployees } = useMisaEmployees(true);

  // ── Local state ──
  const [statusIds, setStatusIds] = useState<string[]>(
    (filters.statusIds ?? []).map(String)
  );
  const [misaSyncStatus, setMisaSyncStatus] = useState<string[]>(
    filters.misaSyncStatus ?? []
  );
  const [misaEmployeeCodes, setMisaEmployeeCodes] = useState<string[]>(
    filters.misaEmployeeCodes ?? []
  );
  const [taxCodeStatus, setTaxCodeStatus] = useState<string>(
    filters.taxCodeStatus || ""
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

  // Khách hàng
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

  // Thời gian cập nhật (updatedAt)
  const [updatedDateMode, setUpdatedDateMode] = useState<"preset" | "custom">(
    filters._updatedDateMode || "preset"
  );
  const [updatedPreset, setUpdatedPreset] = useState<string>(
    filters._updatedPreset || "all_time"
  );
  const [updatedFromDate, setUpdatedFromDate] = useState<string>(
    filters._updatedFromDate || isoToDateInput(filters.fromUpdatedDate)
  );
  const [updatedToDate, setUpdatedToDate] = useState<string>(
    filters._updatedToDate || isoToDateInput(filters.toUpdatedDate)
  );

  const handleApply = () => {
    const f: any = {
      pageSize: 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
    };

    if (statusIds.length > 0) f.statusIds = statusIds.map(Number);
    if (misaSyncStatus.length > 0) f.misaSyncStatus = misaSyncStatus;
    if (misaEmployeeCodes.length > 0) f.misaEmployeeCodes = misaEmployeeCodes;
    if (taxCodeStatus) f.taxCodeStatus = taxCodeStatus;
    if (branchIds.length > 0) f.branchIds = branchIds.map(Number);
    if (createdByIds.length > 0) f.createdByIds = createdByIds.map(Number);
    if (soldByIds.length > 0) f.soldByIds = soldByIds.map(Number);
    if (customerIds.length > 0) {
      f.customerIds = customerIds;
      f._customerLabel = customerLabel;
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

    if (
      updatedDateMode === "preset" &&
      updatedPreset &&
      updatedPreset !== "all_time"
    ) {
      const range = getDateRangeFromPreset(updatedPreset);
      f._updatedPreset = updatedPreset;
      f.fromUpdatedDate = range.from.toISOString();
      f.toUpdatedDate = range.to.toISOString();
    } else if (
      updatedDateMode === "custom" &&
      (updatedFromDate || updatedToDate)
    ) {
      f._updatedDateMode = "custom";
      f._updatedFromDate = updatedFromDate;
      f._updatedToDate = updatedToDate;
      if (updatedFromDate)
        f.fromUpdatedDate = dateInputToIsoStart(updatedFromDate);
      if (updatedToDate) f.toUpdatedDate = dateInputToIsoEnd(updatedToDate);
    }

    onApply(f);
  };

  const handleReset = () => {
    setStatusIds([]);
    setMisaSyncStatus([]);
    setMisaEmployeeCodes([]);
    setTaxCodeStatus("");
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
    setUpdatedDateMode("preset");
    setUpdatedPreset("all_time");
    setUpdatedFromDate("");
    setUpdatedToDate("");
  };

  const dateSummary =
    dateMode === "custom" && (fromDate || toDate)
      ? `${fromDate || "…"} → ${toDate || "…"}`
      : preset !== "all_time"
        ? DATE_PRESETS.find((p) => p.value === preset)?.label
        : undefined;

  const updatedDateSummary =
    updatedDateMode === "custom" && (updatedFromDate || updatedToDate)
      ? `${updatedFromDate || "…"} → ${updatedToDate || "…"}`
      : updatedPreset !== "all_time"
        ? DATE_PRESETS.find((p) => p.value === updatedPreset)?.label
        : undefined;

  const userOptions: ChipOption[] = (users ?? []).map((u: any) => ({
    value: String(u.id),
    label: u.name,
  }));
  const branchOptions: ChipOption[] = activeBranches.map((b: any) => ({
    value: String(b.id),
    label: b.name,
  }));
  const misaEmployeeOptions: ChipOption[] = (misaEmployees ?? []).map((e) => ({
    value: e.code,
    label: e.name || e.code,
  }));

  const activeCount = [
    statusIds.length > 0,
    misaSyncStatus.length > 0,
    misaEmployeeCodes.length > 0,
    !!taxCodeStatus,
    branchIds.length > 0,
    customerIds.length > 0,
    createdByIds.length > 0,
    soldByIds.length > 0,
    !!paymentMethod,
    dateMode === "custom" ? !!(fromDate || toDate) : preset !== "all_time",
    updatedDateMode === "custom"
      ? !!(updatedFromDate || updatedToDate)
      : updatedPreset !== "all_time",
  ].filter(Boolean).length;

  return (
    <MobileFilterSheet
      title="Bộ lọc"
      activeCount={activeCount}
      onReset={handleReset}
      onApply={handleApply}
      onClose={onClose}>
      {/* Trạng thái đồng bộ Misa */}
      <FilterSection
        label="Trạng thái Misa"
        defaultOpen
        summary={
          misaSyncStatus.length > 0
            ? `${misaSyncStatus.length} đã chọn`
            : undefined
        }>
        <ChipGroup
          options={MISA_FILTER_OPTIONS}
          values={misaSyncStatus}
          onChange={setMisaSyncStatus}
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

      {/* Thời gian cập nhật */}
      <FilterSection label="Thời gian cập nhật" summary={updatedDateSummary}>
        <DateRangeFilter
          presets={DATE_PRESETS}
          mode={updatedDateMode}
          preset={updatedPreset}
          fromDate={updatedFromDate}
          toDate={updatedToDate}
          onChange={(next) => {
            setUpdatedDateMode(next.mode);
            setUpdatedPreset(next.preset);
            setUpdatedFromDate(next.fromDate);
            setUpdatedToDate(next.toDate);
          }}
        />
      </FilterSection>

      {/* Trạng thái hóa đơn */}
      <FilterSection
        label="Trạng thái hóa đơn"
        summary={
          statusIds.length > 0 ? `${statusIds.length} đã chọn` : undefined
        }>
        <ChipGroup
          options={FILTER_STATUS_OPTIONS}
          values={statusIds}
          onChange={setStatusIds}
        />
      </FilterSection>

      {/* Nhân viên phụ trách (Misa) */}
      <FilterSection
        label="Nhân viên phụ trách"
        summary={
          misaEmployeeCodes.length > 0
            ? `${misaEmployeeCodes.length} đã chọn`
            : undefined
        }>
        <SearchableChecklist
          options={misaEmployeeOptions}
          values={misaEmployeeCodes}
          searchPlaceholder="Tìm nhân viên..."
          emptyText="Không có nhân viên"
          onChange={setMisaEmployeeCodes}
        />
      </FilterSection>

      {/* Mã số thuế (trống / không trống) */}
      <FilterSection
        label="Mã số thuế"
        summary={
          taxCodeStatus === "filled"
            ? "Có mã số thuế"
            : taxCodeStatus === "empty"
              ? "Không có mã số thuế"
              : undefined
        }>
        <ChipGroup
          options={[
            { value: "filled", label: "Có mã số thuế" },
            { value: "empty", label: "Không có mã số thuế" },
          ]}
          values={taxCodeStatus ? [taxCodeStatus] : []}
          multiple={false}
          onChange={(v) => setTaxCodeStatus(v[0] ?? "")}
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
          <div className="flex items-center justify-between gap-2 border border-brand-border bg-brand-soft rounded-xl px-3 py-2.5">
            <span className="text-sm text-brand-dark font-medium truncate">
              {customerLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomerIds([]);
                setCustomerLabel("");
                setCustomerQuery("");
              }}
              className="text-brand hover:text-brand-dark flex-shrink-0">
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
                  className="w-full pl-8 pr-2 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
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
                    className={`w-full text-left px-3 py-2.5 hover:bg-brand-soft transition-colors ${
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

// ─── HoaDonVatMobileView (main export) ────────────────────────────────────────
interface HoaDonVatMobileViewProps {
  filters: any;
  onFiltersChange: (f: any) => void;
}

export function HoaDonVatMobileView({
  filters,
  onFiltersChange,
}: HoaDonVatMobileViewProps) {
  // ── Filter của riêng mobile (khôi phục từ localStorage) ──
  const [localFilters, setLocalFilters] = useState<any>(
    () => readMobileFilters(STORAGE_KEY) ?? filters ?? {}
  );
  const [search, setSearch] = useState(
    () => filters?.search ?? localFilters?.search ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeTab, setActiveTab] = useState<string>("all");
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

  // Tab nhanh ghi đè trạng thái Misa — chỉ khi sheet không lọc đa trạng thái Misa.
  const effectiveFilters = {
    ...apiFilters,
    ...(activeTab !== "all" &&
    (!apiFilters.misaSyncStatus || apiFilters.misaSyncStatus.length === 0)
      ? { misaSyncStatus: [activeTab] }
      : {}),
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
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
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
                ? "bg-brand hover:bg-brand-dark"
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
                    ? "border-brand text-brand bg-brand-soft"
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
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
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
