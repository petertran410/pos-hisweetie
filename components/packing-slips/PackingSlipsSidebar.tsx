"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { X, Search } from "lucide-react";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";

interface PackingSlipsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "dong-hang", label: "Đóng hàng" },
  { value: "loading", label: "Loading" },
  { value: "giao-hang", label: "Giao hàng" },
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
  const [search, setSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

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
      if (search) filters.search = search;
      if (invoiceSearch) filters.invoiceSearch = invoiceSearch;
      if (customerSearch) filters.customerSearch = customerSearch;
      onFiltersChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedBranchIds, type, search, invoiceSearch, customerSearch]);

  const clearAllFilters = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setType("all");
    setSearch("");
    setInvoiceSearch("");
    setCustomerSearch("");
    onFiltersChange({});
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (type !== "all") n++;
    if (search) n++;
    if (invoiceSearch) n++;
    if (customerSearch) n++;
    return n;
  }, [selectedBranchIds, type, search, invoiceSearch, customerSearch]);

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
