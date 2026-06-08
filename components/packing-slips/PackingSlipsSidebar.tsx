"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown, X, Check, Search } from "lucide-react";

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
  const activeBranches = useMemo(
    () => (branches || []).filter((b: any) => b.isActive),
    [branches]
  );

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(
    selectedBranch ? [selectedBranch.id] : []
  );
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const selectedTypeLabel =
    TYPE_OPTIONS.find((opt) => opt.value === type)?.label || "Tất cả";

  // ─── BranchMultiSelectDropdown ─────────────────────────────────────────────
  function BranchMultiSelectDropdown({
    branches,
    selectedIds,
    onChange,
  }: {
    branches: { id: number; name: string }[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
  }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const h = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node))
          setOpen(false);
      };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    const toggle = (id: number) => {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id]
      );
    };

    const label =
      selectedIds.length === 0
        ? null
        : selectedIds.length === 1
          ? (branches.find((b) => b.id === selectedIds[0])?.name ?? "")
          : `${selectedIds.length} chi nhánh`;

    return (
      <div ref={ref} className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((p) => !p)}
          onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
          className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
            open
              ? "border-brand ring-2 ring-brand-soft"
              : "hover:border-gray-400"
          }`}>
          <span className={label ? "text-gray-800 truncate" : "text-gray-400"}>
            {label ?? "Tất cả chi nhánh"}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {branches.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  selectedIds.includes(b.id) ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(b.id)}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 accent-brand flex-shrink-0"
                />
                <span className="text-gray-700">{b.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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
        <div ref={typeDropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại
          </label>
          <div
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
              showTypeDropdown
                ? "border-brand ring-2 ring-brand-soft"
                : "hover:border-gray-400"
            }`}>
            <span
              className={
                type !== "all" ? "text-gray-800" : "text-gray-400"
              }>
              {selectedTypeLabel}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {type !== "all" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setType("all");
                  }}
                  className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${showTypeDropdown ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          {showTypeDropdown && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {TYPE_OPTIONS.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setType(option.value);
                    setShowTypeDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                    option.value === type
                      ? "bg-brand-soft text-brand-dark font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                  <span>{option.label}</span>
                  {option.value === type && (
                    <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <BranchMultiSelectDropdown
            branches={activeBranches}
            selectedIds={selectedBranchIds}
            onChange={setSelectedBranchIds}
          />
        </div>
      </div>
    </aside>
  );
}
