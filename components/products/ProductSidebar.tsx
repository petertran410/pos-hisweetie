"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { ChevronDown, Check } from "lucide-react";

interface ProductsSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Hoạt động",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "inactive",
    label: "Ngừng hoạt động",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const STOCK_OPTIONS = [
  { value: "instock", label: "Còn hàng" },
  { value: "outstock", label: "Hết hàng" },
];

// Loại sản phẩm — khớp map ở ProductTable.getProductTypeLabel & backend.
const PRODUCT_TYPE_OPTIONS = [
  { value: 2, label: "Hàng hóa" },
  { value: 3, label: "Dịch vụ" },
  { value: 1, label: "Combo - đóng gói" },
  { value: 4, label: "Hàng sản xuất" },
];

const DIRECT_SALE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

// ─── SimpleDropdown ──────────────────────────────────────────────────────────
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

// ─── Main ────────────────────────────────────────────────────────────────────
export function ProductsSidebar({ onFiltersChange }: ProductsSidebarProps) {
  const { data: parentCategories } = useCategories("parent");
  const { data: middleCategories } = useCategories("middle");
  const { data: childCategories } = useCategories("child");
  const { data: trademarks } = useTrademarks();

  // Mặc định lọc "Hoạt động".
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [parentName, setParentName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [childName, setChildName] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [tradeMarkId, setTradeMarkId] = useState("");
  const [directSale, setDirectSale] = useState("");

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

  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: any) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  const activeFilterCount = [
    selectedStatus,
    parentName,
    middleName,
    childName,
    stockStatus,
    tradeMarkId,
    directSale,
  ].filter(Boolean).length + (selectedTypes.length > 0 ? 1 : 0);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (selectedStatus === "active") f.isActive = true;
      if (selectedStatus === "inactive") f.isActive = false;
      if (selectedTypes.length > 0) f.types = selectedTypes;
      if (parentName) f.parentName = parentName;
      if (middleName) f.middleName = middleName;
      if (childName) f.childName = childName;
      if (stockStatus) f.stockStatus = stockStatus;
      if (tradeMarkId) f.tradeMarkId = Number(tradeMarkId);
      if (directSale === "yes") f.isDirectSale = true;
      if (directSale === "no") f.isDirectSale = false;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedStatus,
    selectedTypes,
    parentName,
    middleName,
    childName,
    stockStatus,
    tradeMarkId,
    directSale,
  ]);

  const clearAll = () => {
    setSelectedStatus("");
    setSelectedTypes([]);
    setParentName("");
    setMiddleName("");
    setChildName("");
    setStockStatus("");
    setTradeMarkId("");
    setDirectSale("");
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
        {/* ── Trạng thái ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    selectedStatus === opt.value ? "" : opt.value
                  )
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedStatus === opt.value
                    ? opt.color + " border-current"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedStatus === opt.value ? opt.dot : "bg-gray-300"
                  }`}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loại sản phẩm ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại sản phẩm
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TYPE_OPTIONS.map((opt) => {
              const isActive = selectedTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSelectedTypes((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((t) => t !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}>
                  {isActive && <Check className="w-3 h-3" />}
                  {opt.label}
                </button>
              );
            })}
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

        {/* ── Thương hiệu ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thương hiệu
          </label>
          <SimpleDropdown
            options={trademarkOptions}
            value={tradeMarkId}
            placeholder="Tất cả"
            onChange={setTradeMarkId}
          />
        </div>

        {/* ── Bán trực tiếp ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bán trực tiếp
          </label>
          <SimpleDropdown
            options={DIRECT_SALE_OPTIONS}
            value={directSale}
            placeholder="Tất cả"
            onChange={setDirectSale}
          />
        </div>
      </div>
    </aside>
  );
}
