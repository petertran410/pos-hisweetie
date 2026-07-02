"use client";

import { useState, useEffect, useMemo } from "react";
import { useCategories } from "@/lib/hooks/useCategories";
import { Category } from "@/lib/api/categories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { TradeMark } from "@/lib/api/trademarks";
import { Check } from "lucide-react";
import { MultiSelectDropdown } from "@/components/shared/MultiSelectDropdown";
import { SimpleDropdown } from "@/components/shared/SimpleDropdown";

interface ProductsSidebarProps {
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
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

export function ProductsSidebar({ onFiltersChange }: ProductsSidebarProps) {
  const { data: parentCategories } = useCategories("parent", {
    silentForbidden: true,
  });
  const { data: middleCategories } = useCategories("middle", {
    silentForbidden: true,
  });
  const { data: childCategories } = useCategories("child", {
    silentForbidden: true,
  });
  const { data: trademarks } = useTrademarks({ silentForbidden: true });

  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);
  const [middleNames, setMiddleNames] = useState<string[]>([]);
  const [childNames, setChildNames] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState("");
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);
  const [directSale, setDirectSale] = useState("");

  const parentOptions = useMemo(
    () =>
      (parentCategories || [])
        .filter((c: Category) => c.type === "parent")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [parentCategories]
  );

  const middleOptions = useMemo(
    () =>
      (middleCategories || [])
        .filter((c: Category) => c.type === "middle")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [middleCategories]
  );

  const childOptions = useMemo(
    () =>
      (childCategories || [])
        .filter((c: Category) => c.type === "child")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [childCategories]
  );

  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: TradeMark) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  const activeFilterCount =
    [selectedStatus, stockStatus, directSale].filter(Boolean).length +
    (selectedTypes.length > 0 ? 1 : 0) +
    (parentNames.length > 0 ? 1 : 0) +
    (middleNames.length > 0 ? 1 : 0) +
    (childNames.length > 0 ? 1 : 0) +
    (tradeMarkIds.length > 0 ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: Record<string, unknown> = {};
      if (selectedStatus === "active") f.isActive = true;
      if (selectedStatus === "inactive") f.isActive = false;
      if (selectedTypes.length > 0) f.types = selectedTypes;
      if (parentNames.length > 0) f.parentNames = parentNames;
      if (middleNames.length > 0) f.middleNames = middleNames;
      if (childNames.length > 0) f.childNames = childNames;
      if (stockStatus) f.stockStatus = stockStatus;
      if (tradeMarkIds.length > 0) f.tradeMarkIds = tradeMarkIds.map(Number);
      if (directSale === "yes") f.isDirectSale = true;
      if (directSale === "no") f.isDirectSale = false;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedStatus,
    selectedTypes,
    parentNames,
    middleNames,
    childNames,
    stockStatus,
    tradeMarkIds,
    directSale,
    onFiltersChange,
  ]);

  const clearAll = () => {
    setSelectedStatus("");
    setSelectedTypes([]);
    setParentNames([]);
    setMiddleNames([]);
    setChildNames([]);
    setStockStatus("");
    setTradeMarkIds([]);
    setDirectSale("");
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
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
                }`}
              >
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
                      ? "bg-brand-soft text-brand-dark border-brand"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại Hàng
          </label>
          <MultiSelectDropdown
            options={parentOptions}
            values={parentNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm loại hàng..."
            onChange={setParentNames}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nguồn Gốc
          </label>
          <MultiSelectDropdown
            options={middleOptions}
            values={middleNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm nguồn gốc..."
            onChange={setMiddleNames}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Danh Mục
          </label>
          <MultiSelectDropdown
            options={childOptions}
            values={childNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm danh mục..."
            onChange={setChildNames}
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thương hiệu
          </label>
          <MultiSelectDropdown
            options={trademarkOptions}
            values={tradeMarkIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm thương hiệu..."
            onChange={setTradeMarkIds}
          />
        </div>

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
