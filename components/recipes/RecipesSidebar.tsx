"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search, X } from "lucide-react";
import { RecipeQueryParams } from "@/lib/api/recipes";
import { FilterMultiSelect } from "@/components/ui/filters";
import { useRecipeCategories, useRecipeIngredientOptions } from "@/lib/hooks/useRecipes";

interface Props {
  filters: RecipeQueryParams & { page: number; limit: number };
  onChange: (filters: RecipeQueryParams & { page: number; limit: number }) => void;
}

export function RecipesSidebar({ filters, onChange }: Props) {
  const [search, setSearch] = useState(filters.search || "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: categories = [] } = useRecipeCategories();
  const { data: ingredientOptions = [] } = useRecipeIngredientOptions();
  const activeFilterCount = [filters.type, filters.status, filters.categoryId, filters.ingredientFilters?.length ? "ingredients" : undefined].filter(Boolean).length;
  const applySearch = useEffectEvent((value: string) => {
    const normalized = value.trim();
    if (normalized !== (filters.search || "")) {
      onChange({ ...filters, search: normalized || undefined, page: 1 });
    }
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      applySearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectClass =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <aside
      className="w-full shrink-0 border-b bg-white md:w-72 md:border-b-0 md:border-r"
      style={{ borderColor: "var(--dt-border)" }}>
      <div className="hidden border-b px-4 py-4 md:block" style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-brand" />
          <h2 className="font-semibold">Bộ lọc công thức</h2>
        </div>
      </div>
      <div className="flex gap-2 p-3 md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
           <input
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
             aria-label="Tìm công thức theo mã hoặc tên"
             placeholder="Tìm mã hoặc tên..."
             className={`${selectClass} pl-8 pr-9`}
             style={{ borderColor: "var(--dt-border)" }}
           />
           {search && <button type="button" onClick={() => setSearch("")} aria-label="Xóa tìm kiếm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="recipe-mobile-filters"
          className="relative flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium text-[#0D3B42] hover:bg-[#E8F4F5]"
          style={{ borderColor: "var(--dt-border)" }}>
          <Filter className="h-4 w-4" /> Bộ lọc
          {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{activeFilterCount}</span>}
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div id="recipe-mobile-filters" className={`${mobileOpen ? "grid" : "hidden"} grid-cols-2 gap-3 border-t p-3 md:flex md:flex-col md:border-t-0 md:p-4`} style={{ borderColor: "var(--dt-border)" }}>
        <div className="relative col-span-2 hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }} aria-label="Tìm công thức theo mã hoặc tên" placeholder="Tìm mã hoặc tên..." className={`${selectClass} pl-8 pr-9`} style={{ borderColor: "var(--dt-border)" }} />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Xóa tìm kiếm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>}
        </div>
        <div className="col-span-2">
          <FilterMultiSelect
            options={ingredientOptions}
            values={filters.ingredientFilters || []}
            onChange={(values) => onChange({ ...filters, ingredientFilters: values.length ? values : undefined, page: 1 })}
            placeholder="Lọc theo nguyên liệu"
            searchPlaceholder="Tìm nguyên liệu..."
            multiLabel={(count) => `Chứa bất kỳ ${count} nguyên liệu`}
            panelWidth={440}
          />
        </div>
        <select
          value={filters.type || ""}
          onChange={(e) => onChange({ ...filters, type: (e.target.value || undefined) as RecipeQueryParams["type"], page: 1 })}
          className={selectClass}
          style={{ borderColor: "var(--dt-border)" }}>
          <option value="">Tất cả loại</option>
          <option value="FINISHED_PRODUCT">Thành phẩm</option>
          <option value="SEMI_FINISHED">Bán thành phẩm</option>
        </select>
        <select
          value={filters.status || ""}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as RecipeQueryParams["status"], page: 1 })}
          className={selectClass}
          style={{ borderColor: "var(--dt-border)" }}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PUBLISHED">Đã publish</option>
          <option value="ARCHIVED">Đã lưu trữ</option>
        </select>
        <select
          value={filters.categoryId || ""}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          className={`${selectClass} col-span-2`}
          style={{ borderColor: "var(--dt-border)" }}>
          <option value="">Tất cả nhóm</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onChange({ page: 1, limit: 15, orderBy: "updatedAt", orderDirection: "desc" });
          }}
          className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          style={{ borderColor: "var(--dt-border)" }}>
          {activeFilterCount || filters.search ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />} Đặt lại
        </button>
      </div>
    </aside>
  );
}
