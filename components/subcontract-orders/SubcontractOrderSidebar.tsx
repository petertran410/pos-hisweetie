"use client";

import { useEffect, useMemo, useState } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useFactories } from "@/lib/hooks/useFactories";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import {
  SUBCONTRACT_STATUS_TEXT,
  type SubcontractOrderFilters,
} from "@/lib/types/subcontract-order";

interface SubcontractOrderSidebarProps {
  onFiltersChange: (filters: SubcontractOrderFilters) => void;
}

const STATUS_OPTIONS = Object.entries(SUBCONTRACT_STATUS_TEXT).map(
  ([value, label]) => ({ value, label }),
);

const ALL_TIME: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "all_time",
  fromDate: "",
  toDate: "",
};

export function SubcontractOrderSidebar({
  onFiltersChange,
}: SubcontractOrderSidebarProps) {
  const { data: branches } = useBranches();
  const factories = useFactories({ includeInactive: false, limit: 500 });

  const branchOptions = useMemo(
    () =>
      (branches || [])
        .filter((b) => b.isActive)
        .map((b) => ({ value: String(b.id), label: b.name })),
    [branches],
  );
  const factoryOptions = useMemo(
    () =>
      (factories?.data ?? []).map((f) => ({
        value: String(f.id),
        label: f.code ? `${f.code} — ${f.name}` : f.name,
      })),
    [factories],
  );

  const [statuses, setStatuses] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [factoryId, setFactoryId] = useState("");
  const [orderRange, setOrderRange] = useState<TimeRangeState>(ALL_TIME);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: SubcontractOrderFilters = {};
      if (statuses.length > 0) filters.status = statuses.map(Number);
      if (branchIds.length > 0) filters.branchIds = branchIds.map(Number);
      if (factoryId) filters.factoryId = Number(factoryId);
      const iso = rangeToIso(orderRange);
      if (iso) {
        filters.fromDate = iso.from;
        filters.toDate = iso.to;
      }
      onFiltersChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [statuses, branchIds, factoryId, orderRange, onFiltersChange]);

  const activeFilterCount =
    (statuses.length > 0 ? 1 : 0) +
    (branchIds.length > 0 ? 1 : 0) +
    (factoryId ? 1 : 0) +
    (orderRange.selectedPreset !== "all_time" ||
    orderRange.dateMode === "custom"
      ? 1
      : 0);

  const clearAllFilters = () => {
    setStatuses([]);
    setBranchIds([]);
    setFactoryId("");
    setOrderRange(ALL_TIME);
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <TimeRangeFilter
          label="Ngày lập lệnh"
          value={orderRange}
          onChange={setOrderRange}
        />

        <div className="border-t border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <FilterMultiSelect
            options={STATUS_OPTIONS}
            values={statuses}
            onChange={setStatuses}
            placeholder="Tất cả trạng thái"
            searchable={false}
            multiLabel={(n) => `${n} trạng thái`}
          />
        </div>

        <div className="border-t border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhà máy
          </label>
          <FilterSearchableSelect
            options={factoryOptions}
            value={factoryId}
            placeholder="Tất cả nhà máy"
            searchPlaceholder="Tìm nhà máy..."
            onChange={(v) => setFactoryId(v || "")}
          />
        </div>

        <div className="border-t border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branchOptions}
            values={branchIds}
            onChange={setBranchIds}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>
      </div>
    </aside>
  );
}
