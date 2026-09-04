"use client";

import React, { useMemo } from "react";
import { Filter, RotateCcw, Layers } from "lucide-react";
import type {
  TransferPlanningFilters,
  QuickFilterType,
  AlertFilterType,
} from "@/lib/types/transfer-planning";
import { FilterMultiSelect } from "@/components/ui/filters/FilterMultiSelect";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import type { Category } from "@/lib/api/categories";

interface TransferPlanningSidebarProps {
  filters: TransferPlanningFilters;
  onFiltersChange: (newFilters: Partial<TransferPlanningFilters>) => void;
  onReset: () => void;
  totalFiltered: number;
}

const CARGO_TYPE_OPTIONS = [
  { value: "COLD", label: "Hàng lạnh" },
  { value: "NORMAL", label: "Hàng thường" },
];

const toArray = <T,>(val: unknown): T[] => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object" && "data" in val && Array.isArray((val as any).data)) {
    return (val as any).data;
  }
  return [];
};

export function TransferPlanningSidebar({
  filters,
  onFiltersChange,
  onReset,
  totalFiltered,
}: TransferPlanningSidebarProps) {
  const activeQuick = filters.quickFilter || "ALL";
  const activeAlert = filters.alertFilter || "ALL";

  // Data cho các bộ lọc Hàng hoá từ API thật
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

  const parentOptions = useMemo(() => {
    const list = toArray<Category>(parentCategories);
    if (list.length > 0) {
      return list
        .filter((c: Category) => c.type === "parent")
        .map((c: Category) => ({ value: c.name, label: c.name }));
    }
    // Fallback options
    return [
      { value: "Nguyên liệu pha chế", label: "Nguyên liệu pha chế" },
      { value: "Dụng cụ & Bao bì", label: "Dụng cụ & Bao bì" },
    ];
  }, [parentCategories]);

  const middleOptions = useMemo(() => {
    const list = toArray<Category>(middleCategories);
    if (list.length > 0) {
      return list
        .filter((c: Category) => c.type === "middle")
        .map((c: Category) => ({ value: c.name, label: c.name }));
    }
    // Fallback options
    return [
      { value: "Trà lá khô", label: "Trà lá khô" },
      { value: "Bột pha chế", label: "Bột pha chế" },
      { value: "Syrup & Sốt", label: "Syrup & Sốt" },
      { value: "Mứt & Puree", label: "Mứt & Puree" },
      { value: "Topping", label: "Topping" },
      { value: "Ly & Nắp", label: "Ly & Nắp" },
      { value: "Ống hút", label: "Ống hút" },
      { value: "Nguyên liệu cơ bản", label: "Nguyên liệu cơ bản" },
    ];
  }, [middleCategories]);

  const childOptions = useMemo(() => {
    const list = toArray<Category>(childCategories);
    if (list.length > 0) {
      return list
        .filter((c: Category) => c.type === "child")
        .map((c: Category) => ({ value: c.name, label: c.name }));
    }
    // Fallback options
    return [
      { value: "Trà đen", label: "Trà đen" },
      { value: "Trà lài", label: "Trà lài" },
      { value: "Trà ô long", label: "Trà ô long" },
      { value: "Trà xanh", label: "Trà xanh" },
      { value: "Bột sữa", label: "Bột sữa" },
      { value: "Bột sữa chua", label: "Bột sữa chua" },
      { value: "Bột kem cheese", label: "Bột kem cheese" },
      { value: "Bột pudding", label: "Bột pudding" },
      { value: "Bột khoai môn", label: "Bột khoai môn" },
      { value: "Matcha", label: "Matcha" },
      { value: "Syrup đường đen", label: "Syrup đường đen" },
      { value: "Syrup trái cây", label: "Syrup trái cây" },
      { value: "Mứt dâu", label: "Mứt dâu" },
      { value: "Mứt ổi", label: "Mứt ổi" },
      { value: "Sốt hạt dẻ", label: "Sốt hạt dẻ" },
      { value: "Trân châu", label: "Trân châu" },
      { value: "Thạch", label: "Thạch" },
      { value: "Hạt sen", label: "Hạt sen" },
      { value: "Đường nước", label: "Đường nước" },
      { value: "Ly giấy", label: "Ly giấy" },
      { value: "Ống hút giấy", label: "Ống hút giấy" },
    ];
  }, [childCategories]);

  const trademarkOptions = useMemo(() => {
    const list = toArray<{ id: number; name: string }>(trademarks);
    if (list.length > 0) {
      return list.map((t) => ({
        value: String(t.id),
        label: t.name,
      }));
    }
    // Fallback options
    return [
      { value: "1", label: "Diệp Trà" },
      { value: "2", label: "Trà Phượng Hoàng" },
      { value: "3", label: "Gấu LerMao" },
      { value: "4", label: "Bao bì HiSweetie" },
    ];
  }, [trademarks]);

  const quickFilterOptions: Array<{ key: QuickFilterType; label: string }> = [
    { key: "ALL", label: "Tất cả" },
    { key: "NEED_TRANSFER", label: "Cần chuyển (SL > 0)" },
    { key: "NO_TRANSFER", label: "Không cần chuyển" },
    { key: "HAS_CONFIRMED_ORDERS", label: "Có đơn xác nhận" },
  ];

  const alertFilterOptions: Array<{
    key: AlertFilterType;
    label: string;
    textClass: string;
  }> = [
    { key: "ALL", label: "Tất cả cảnh báo", textClass: "text-gray-700" },
    { key: "DARK_RED", label: "CHUYỂN GẤP (Đơn > Tồn)", textClass: "text-rose-700 font-bold" },
    { key: "RED", label: "Cần điều chuyển", textClass: "text-red-600 font-semibold" },
    { key: "YELLOW", label: "Cần xem xét", textClass: "text-amber-600 font-medium" },
    { key: "GREEN", label: "Đủ hàng", textClass: "text-emerald-600" },
  ];

  const hasActiveFilters =
    Boolean(filters.search) ||
    activeQuick !== "ALL" ||
    activeAlert !== "ALL" ||
    (filters.parentNames && filters.parentNames.length > 0) ||
    (filters.middleNames && filters.middleNames.length > 0) ||
    (filters.childNames && filters.childNames.length > 0) ||
    Boolean(filters.cargoType) ||
    (filters.tradeMarkIds && filters.tradeMarkIds.length > 0);

  return (
    <aside
      className="w-64 shrink-0 border-r bg-white flex flex-col h-full overflow-y-auto custom-sidebar-scroll"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
          <Filter className="w-4 h-4 text-primary" />
          <span>Bộ lọc kế hoạch</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            title="Đặt lại bộ lọc">
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1 text-sm">
        {/* Lộ trình điều chuyển cố định */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Lộ trình cố định
          </div>
          <div className="flex items-center justify-between text-xs text-gray-700 font-medium">
            <span className="font-semibold text-gray-900">Kho Hà Nội</span>
            <span className="text-primary font-bold">→</span>
            <span className="font-semibold text-gray-900">Kho Sài Gòn</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Lead time: 5 ngày · An toàn: 2 ngày
          </div>
        </div>

        {/* 1. Nhu cầu điều chuyển */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Nhu cầu điều chuyển
          </label>
          <div className="space-y-1">
            {quickFilterOptions.map((opt) => {
              const isSelected = activeQuick === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onFiltersChange({ quickFilter: opt.key, page: 1 })}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-primary text-white font-medium shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Mức độ cảnh báo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Mức độ cảnh báo
          </label>
          <div className="space-y-1">
            {alertFilterOptions.map((opt) => {
              const isSelected = activeAlert === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onFiltersChange({ alertFilter: opt.key, page: 1 })}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                    isSelected
                      ? "bg-gray-800 text-white font-medium"
                      : "hover:bg-gray-100"
                  }`}>
                  <span className={`truncate ${isSelected ? "text-white" : opt.textClass}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t my-2" style={{ borderColor: "var(--dt-border)" }} />

        {/* 3. BỘ LỌC HÀNG HOÁ TƯƠNG TỰ /san-pham/danh-sach */}
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Phân loại hàng hóa
          </label>

          {/* 3a. Loại Hàng */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Loại Hàng</label>
            <FilterMultiSelect
              options={parentOptions}
              values={filters.parentNames || []}
              placeholder="Tất cả loại hàng"
              searchPlaceholder="Tìm loại hàng..."
              onChange={(values) => onFiltersChange({ parentNames: values, page: 1 })}
            />
          </div>

          {/* 3b. Nguồn Gốc */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nguồn Gốc</label>
            <FilterMultiSelect
              options={middleOptions}
              values={filters.middleNames || []}
              placeholder="Tất cả nguồn gốc"
              searchPlaceholder="Tìm nguồn gốc..."
              onChange={(values) => onFiltersChange({ middleNames: values, page: 1 })}
            />
          </div>

          {/* 3c. Danh Mục */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Danh Mục</label>
            <FilterMultiSelect
              options={childOptions}
              values={filters.childNames || []}
              placeholder="Tất cả danh mục"
              searchPlaceholder="Tìm danh mục..."
              onChange={(values) => onFiltersChange({ childNames: values, page: 1 })}
            />
          </div>

          {/* 3d. Loại vận chuyển */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Loại vận chuyển</label>
            <select
              value={filters.cargoType || ""}
              onChange={(e) =>
                onFiltersChange({
                  cargoType: e.target.value as "COLD" | "NORMAL" | "",
                  page: 1,
                })
              }
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-primary">
              <option value="">Tất cả</option>
              {CARGO_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3e. Thương hiệu */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Thương hiệu</label>
            <FilterMultiSelect
              options={trademarkOptions}
              values={(filters.tradeMarkIds || []).map(String)}
              placeholder="Tất cả thương hiệu"
              searchPlaceholder="Tìm thương hiệu..."
              onChange={(values) =>
                onFiltersChange({
                  tradeMarkIds: values.map(Number),
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div
        className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center"
        style={{ borderColor: "var(--dt-border)" }}>
        Đang lọc: <strong className="text-gray-800 font-semibold">{totalFiltered}</strong> SKU
      </div>
    </aside>
  );
}
