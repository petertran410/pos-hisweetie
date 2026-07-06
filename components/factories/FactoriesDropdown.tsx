"use client";

import { useState } from "react";
import { Factory as FactoryIcon, Plus } from "lucide-react";
import { useFactories } from "@/lib/hooks/useFactories";
import { Factory } from "@/lib/api/factories";

interface FactoriesDropdownProps {
  value?: number | null;
  onChange: (factoryId: number | null) => void;
  placeholder?: string;
  /** Loại trừ 1 factoryId khỏi danh sách (vd để không chọn trùng primary/backup) */
  excludeFactoryId?: number | null;
  disabled?: boolean;
  className?: string;
  /** Label hiển thị */
  label?: string;
}

export function FactoriesDropdown({
  value,
  onChange,
  placeholder = "Chọn nhà máy...",
  excludeFactoryId,
  disabled,
  className = "",
  label,
}: FactoriesDropdownProps) {
  const data = useFactories({ includeInactive: false, limit: 500 });
  const isLoading = !data;
  const factories: Factory[] = (data?.data ?? []).filter(
    (f) => f.id !== excludeFactoryId
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <FactoryIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <select
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          disabled={disabled || isLoading}
          className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ borderColor: "var(--dt-border)" }}>
          <option value="">{placeholder}</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>
              {f.code ? `${f.code} — ` : ""}
              {f.name}
              {f.country ? ` (${f.country})` : ""}
            </option>
          ))}
        </select>
      </div>
      {isLoading && (
        <p className="text-xs text-gray-400 mt-1">Đang tải danh sách nhà máy...</p>
      )}
    </div>
  );
}