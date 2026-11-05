"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { X, Search, AlertTriangle, Banknote, ChevronDown } from "lucide-react";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";

interface PackingSlipsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "dong-hang", label: "Đóng hàng" },
  { value: "loading", label: "Loading" },
  { value: "giao-hang", label: "Giao hàng" },
];

// Chỉ PackingSlip (giao hàng) có paymentMethod.
// Khi chọn filter này → đóng hàng & loading bị loại bỏ hoàn toàn.
const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
];

export function PackingSlipsSidebar({
  onFiltersChange,
}: PackingSlipsSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const branchOptions = useMemo(
    () =>
      (branches || [])
        .filter((b: any) => b.isActive)
        .map((b: any) => ({ value: String(b.id), label: b.name })),
    [branches]
  );

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(
    selectedBranch ? [selectedBranch.id] : []
  );
  const [type, setType] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("");
  // Chỉ phiếu giao hàng lệch tiền mặt so với ghi chú thanh toán của hóa đơn.
  const [cashWarning, setCashWarning] = useState(false);
  const [showWarningFilters, setShowWarningFilters] = useState(false);
  const warningFiltersRef = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài thì thu nhóm cảnh báo lại (giống bộ lọc hóa đơn).
  useEffect(() => {
    if (!showWarningFilters) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        warningFiltersRef.current &&
        !warningFiltersRef.current.contains(event.target as Node)
      ) {
        setShowWarningFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showWarningFilters]);
  const [search, setSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  // Thời gian tạo (createdAt) — áp cho cả 3 loại báo đơn.
  const [createdRange, setCreatedRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "all_time",
    fromDate: "",
    toDate: "",
  });

  // Sync branch khi user đổi chi nhánh ở header — skip lần mount đầu
  const isFirstRenderRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const currentBranchId = selectedBranch?.id ?? null;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastSyncedBranchIdRef.current = currentBranchId;
      return;
    }
    if (currentBranchId !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = currentBranchId;
      setSelectedBranchIds(currentBranchId ? [currentBranchId] : []);
    }
  }, [selectedBranch?.id]);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: any = {};
      if (selectedBranchIds.length > 0) filters.branchIds = selectedBranchIds;
      if (type && type !== "all") filters.type = type;
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (cashWarning) filters.cashWarning = true;
      if (search) filters.search = search;
      if (invoiceSearch) filters.invoiceSearch = invoiceSearch;
      if (customerSearch) filters.customerSearch = customerSearch;
      const createdIso = rangeToIso(createdRange);
      if (createdIso) {
        filters.fromCreatedDate = createdIso.from;
        filters.toCreatedDate = createdIso.to;
      }
      onFiltersChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedBranchIds,
    type,
    paymentMethod,
    cashWarning,
    search,
    invoiceSearch,
    customerSearch,
    createdRange,
  ]);

  const clearAllFilters = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setType("all");
    setPaymentMethod("");
    setCashWarning(false);
    setSearch("");
    setInvoiceSearch("");
    setCustomerSearch("");
    setCreatedRange({
      dateMode: "preset",
      selectedPreset: "all_time",
      fromDate: "",
      toDate: "",
    });
    onFiltersChange({});
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (type !== "all") n++;
    if (paymentMethod) n++;
    if (cashWarning) n++;
    if (search) n++;
    if (invoiceSearch) n++;
    if (customerSearch) n++;
    if (
      createdRange.selectedPreset !== "all_time" ||
      createdRange.dateMode === "custom"
    )
      n++;
    return n;
  }, [
    selectedBranchIds,
    type,
    paymentMethod,
    cashWarning,
    search,
    invoiceSearch,
    customerSearch,
    createdRange,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Nhóm cảnh báo báo đơn ── */}
        <div
          ref={warningFiltersRef}
          className="rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            aria-expanded={showWarningFilters}
            onClick={() => setShowWarningFilters((current) => !current)}
            className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-2.5 text-sm transition-colors ${
              showWarningFilters || cashWarning
                ? "bg-red-50/60"
                : "bg-white hover:bg-gray-50"
            }`}>
            <span className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 ${
                  cashWarning ? "text-red-500" : "text-gray-400"
                }`}
              />
              <span className="font-medium text-gray-700 whitespace-nowrap">
                Cảnh báo báo đơn
              </span>
              {cashWarning && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                  1
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${
                showWarningFilters ? "rotate-180" : ""
              }`}
            />
          </button>

          {showWarningFilters && (
            <div className="border-t border-gray-100 bg-white p-2">
              <label
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50 cursor-pointer"
                title="Phiếu giao hàng có tiền mặt cần thu khác hóa đơn, hoặc hóa đơn thu tiền mặt mà phiếu chọn chuyển khoản">
                <input
                  type="checkbox"
                  checked={cashWarning}
                  onChange={(event) => setCashWarning(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-brand"
                />
                <Banknote className="h-4 w-4 shrink-0 text-red-500" />
                <span className="text-xs font-medium text-gray-700">
                  Chỉ phiếu lệch tiền mặt
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Thời gian tạo ── */}
        <TimeRangeFilter
          label="Thời gian tạo"
          value={createdRange}
          onChange={setCreatedRange}
        />

        <div className="border-t border-gray-100" />

        {/* ── Tìm kiếm chung ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mã báo đơn, ghi chú..."
              className="w-full border rounded-lg pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tìm theo hóa đơn ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mã hóa đơn
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="Tìm theo mã hóa đơn..."
              className="w-full border rounded-lg pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {invoiceSearch && (
              <button
                onClick={() => setInvoiceSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tìm theo khách hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khách hàng
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Tìm theo tên khách hàng..."
              className="w-full border rounded-lg pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {customerSearch && (
              <button
                onClick={() => setCustomerSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Loại ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại
          </label>
          <FilterSearchableSelect
            options={TYPE_OPTIONS.filter((o) => o.value !== "all")}
            value={type === "all" ? "" : type}
            placeholder="Tất cả"
            searchable={false}
            showClearOption={false}
            onChange={(v) => setType(v || "all")}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Thanh toán ── */}
        {/* Chỉ áp dụng cho giao hàng (PackingSlip). Khi chọn → đóng hàng &
            loading bị loại bỏ hoàn toàn vì không có paymentMethod. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thanh toán
          </label>
          <FilterSearchableSelect
            options={PAYMENT_METHOD_OPTIONS}
            value={paymentMethod}
            placeholder="Tất cả"
            searchable={false}
            showClearOption={false}
            onChange={(v) => setPaymentMethod(v || "")}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branchOptions}
            values={selectedBranchIds.map(String)}
            onChange={(vals) => setSelectedBranchIds(vals.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>
      </div>
    </aside>
  );
}
