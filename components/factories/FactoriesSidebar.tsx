"use client";

import { useState, useEffect, useMemo } from "react";
import { FactoryQueryParams } from "@/lib/api/factories";
import { suppliersApi } from "@/lib/api/suppliers";
import { Supplier } from "@/lib/types/supplier";

interface FactoriesSidebarProps {
  filters: FactoryQueryParams & { page: number; limit: number };
  onFiltersChange: (filters: FactoryQueryParams & { page: number; limit: number }) => void;
}

const COUNTRIES = [
  { code: "VN", name: "Việt Nam" },
  { code: "CN", name: "Trung Quốc" },
  { code: "TH", name: "Thái Lan" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "KH", name: "Campuchia" },
];

const STATUS_OPTIONS = [
  { label: "Chỉ hoạt động", value: false },
  { label: "Bao gồm đã ẩn", value: true },
];

export function FactoriesSidebar({ filters, onFiltersChange }: FactoriesSidebarProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Load danh sách NCC cho dropdown lọc.
  useEffect(() => {
    suppliersApi
      .getSuppliers({ pageSize: 200, isActive: true })
      .then((res) => setSuppliers(res.data || []))
      .catch(() => setSuppliers([]));
  }, []);

  const updateFilters = (next: Partial<FactoryQueryParams>) => {
    onFiltersChange({ ...filters, ...next, page: 1 });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.supplierId) count += 1;
    if (filters.country) count += 1;
    if (filters.includeInactive) count += 1;
    return count;
  }, [filters.supplierId, filters.country, filters.includeInactive]);

  const resetFilters = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit ?? 15,
      orderBy: "name",
      orderDirection: "asc",
    });
  };

  return (
    <aside className="w-72 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Nhà cung cấp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhà cung cấp
          </label>
          <select
            value={filters.supplierId ?? ""}
            onChange={(event) =>
              updateFilters({
                supplierId: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}>
            <option value="">Tất cả nhà cung cấp</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-100" />

        {/* Quốc gia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quốc gia
          </label>
          <select
            value={filters.country ?? ""}
            onChange={(event) =>
              updateFilters({ country: event.target.value || undefined })
            }
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}>
            <option value="">Tất cả quốc gia</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-100" />

        {/* Trạng thái */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => {
              const active = Boolean(filters.includeInactive) === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() =>
                    updateFilters({ includeInactive: option.value || undefined })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "bg-brand text-white border-brand shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
                  }`}>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
