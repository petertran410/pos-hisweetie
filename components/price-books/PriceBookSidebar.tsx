"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCategories } from "@/lib/hooks/useCategories";
import { ChevronDown, Check, Pencil } from "lucide-react";
import type { PriceBook } from "@/lib/api/price-books";

interface PriceBookSidebarProps {
  priceBooks?: PriceBook[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onCreateNew: () => void;
  onEditPriceBook?: (priceBook: PriceBook) => void;
  onFiltersChange: (filters: any) => void;
}

const STOCK_OPTIONS = [
  { value: "instock", label: "Còn hàng" },
  { value: "outstock", label: "Hết hàng" },
];

function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
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

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {value && (
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-2.5 text-sm text-left text-gray-400 hover:bg-gray-50 border-b border-gray-50">
              {placeholder}
            </button>
          )}
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value === value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PriceBookSidebar({
  priceBooks,
  selectedIds,
  onSelectedIdsChange,
  onCreateNew,
  onEditPriceBook,
  onFiltersChange,
}: PriceBookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter states (giống ProductsSidebar)
  const [parentName, setParentName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [childName, setChildName] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const { data: parentCategories } = useCategories("parent");
  const { data: middleCategories } = useCategories("middle");
  const { data: childCategories } = useCategories("child");

  const parentOptions = useMemo(
    () =>
      (parentCategories || [])
        .filter((c: any) => c.type === "parent")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [parentCategories]
  );

  const middleOptions = useMemo(
    () =>
      (middleCategories || [])
        .filter((c: any) => c.type === "middle")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [middleCategories]
  );

  const childOptions = useMemo(
    () =>
      (childCategories || [])
        .filter((c: any) => c.type === "child")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [childCategories]
  );

  const filteredPriceBooks = priceBooks?.filter((pb) =>
    pb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allIds = useMemo(
    () => [0, ...(priceBooks?.map((pb) => pb.id) || [])],
    [priceBooks]
  );

  const isAllSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const selectAll = () => onSelectedIdsChange(allIds);
  const deselectAll = () => onSelectedIdsChange([]);

  const activeFilterCount = [
    parentName,
    middleName,
    childName,
    stockStatus,
  ].filter(Boolean).length;

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (parentName) f.parentName = parentName;
      if (middleName) f.middleName = middleName;
      if (childName) f.childName = childName;
      if (stockStatus) f.stockStatus = stockStatus;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [parentName, middleName, childName, stockStatus]);

  const clearAll = () => {
    setParentName("");
    setMiddleName("");
    setChildName("");
    setStockStatus("");
    onFiltersChange({});
  };

  const togglePriceBook = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const getDisplayText = () => {
    if (selectedIds.length === 0) return "Chọn bảng giá";

    const hasDefaultPriceBook = selectedIds.includes(0);
    const realPriceBooks = selectedIds.filter((id) => id !== 0);

    if (hasDefaultPriceBook && realPriceBooks.length === 0)
      return "Bảng giá chung";

    if (hasDefaultPriceBook && realPriceBooks.length > 0)
      return `Bảng giá chung + ${realPriceBooks.length} bảng giá`;

    if (realPriceBooks.length === 1) {
      const selected = priceBooks?.find((pb) => pb.id === realPriceBooks[0]);
      return selected?.name || "Chọn bảng giá";
    }

    return `Đã chọn ${realPriceBooks.length} bảng giá`;
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header — giống ProductsSidebar */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto h-[600px]">
        {/* ── Bảng giá (giữ nguyên logic multi-select) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bảng giá
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between border rounded-lg px-2 py-1 text-sm hover:bg-gray-50 transition-colors">
              <span className="text-gray-900 truncate">{getDisplayText()}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-90 overflow-y-auto">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    placeholder="Tìm kiếm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* Tạo mới + Select All */}
                <div className="p-1 border-b flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      onCreateNew();
                      setShowDropdown(false);
                    }}
                    className="text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    + Tạo mới
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <label
                    className={`flex items-center gap-3 px-2 py-1 cursor-pointer hover:bg-gray-50 border-b ${
                      selectedIds.includes(0) ? "bg-blue-50" : ""
                    }`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(0)}
                      onChange={() => togglePriceBook(0)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm flex-1 font-medium">
                      Bảng giá chung
                    </span>
                  </label>

                  {filteredPriceBooks?.map((pb) => (
                    <label
                      key={pb.id}
                      className={`group flex items-center gap-3 px-2 py-1 cursor-pointer hover:bg-gray-50 ${
                        selectedIds.includes(pb.id) ? "bg-blue-50" : ""
                      }`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(pb.id)}
                        onChange={() => togglePriceBook(pb.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex-1 truncate">{pb.name}</span>
                      {onEditPriceBook && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditPriceBook(pb);
                            setShowDropdown(false);
                          }}
                          className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Sửa bảng giá">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>
                  ))}
                </div>

                <div className="p-1 border-b flex items-center justify-between gap-2">
                  <button
                    onClick={selectAll}
                    disabled={isAllSelected}
                    className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                    Chọn tất cả
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    disabled={selectedIds.length === 0}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 px-2 py-1 disabled:cursor-not-allowed font-medium">
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Loại Hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại Hàng
          </label>
          <SimpleDropdown
            options={parentOptions}
            value={parentName}
            placeholder="Tất cả"
            onChange={setParentName}
          />
        </div>

        {/* ── Nguồn Gốc ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nguồn Gốc
          </label>
          <SimpleDropdown
            options={middleOptions}
            value={middleName}
            placeholder="Tất cả"
            onChange={setMiddleName}
          />
        </div>

        {/* ── Danh Mục ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Danh Mục
          </label>
          <SimpleDropdown
            options={childOptions}
            value={childName}
            placeholder="Tất cả"
            onChange={setChildName}
          />
        </div>

        {/* ── Tồn kho ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tồn kho
          </label>
          <SimpleDropdown
            options={STOCK_OPTIONS}
            value={stockStatus}
            placeholder="Tất cả"
            onChange={setStockStatus}
          />
        </div>
      </div>
    </aside>
  );
}
