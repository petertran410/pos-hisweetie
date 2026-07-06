"use client";

import { useState, useEffect } from "react";
import { Search, Factory as FactoryIcon, RotateCcw } from "lucide-react";
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

export function FactoriesSidebar({ filters, onFiltersChange }: FactoriesSidebarProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState(filters.search ?? "");

  // Load danh sách NCC cho dropdown
  useEffect(() => {
    suppliersApi
      .getSuppliers({ pageSize: 200, isActive: true } as any)
      .then((res) => setSuppliers(res.data || []))
      .catch(() => setSuppliers([]));
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        onFiltersChange({ ...filters, search: search || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleReset = () => {
    setSearch("");
    onFiltersChange({ page: 1, limit: 15 });
  };

  return (
    <div
      className="w-72 border-r flex flex-col"
      style={{ borderColor: "var(--dt-border)" }}>
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <FactoryIcon className="w-5 h-5 text-brand" />
          <h2 className="font-semibold">Bộ lọc nhà máy</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Tìm kiếm (mã hoặc tên)
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập để tìm..."
              className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ borderColor: "var(--dt-border)" }}
            />
          </div>
        </div>

        {/* Nhà cung cấp */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Nhà cung cấp
          </label>
          <select
            value={filters.supplierId ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                supplierId: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}>
            <option value="">Tất cả NCC</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quốc gia */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Quốc gia
          </label>
          <select
            value={filters.country ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                country: e.target.value || undefined,
                page: 1,
              })
            }
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}>
            <option value="">Tất cả</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Trạng thái
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includeInactive ?? false}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  includeInactive: e.target.checked,
                  page: 1,
                })
              }
              className="rounded"
            />
            <span className="text-sm">Bao gồm đã ẩn</span>
          </label>
        </div>
      </div>

      <div className="p-4 border-t" style={{ borderColor: "var(--dt-border)" }}>
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          style={{ borderColor: "var(--dt-border)" }}>
          <RotateCcw className="w-4 h-4" />
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
}