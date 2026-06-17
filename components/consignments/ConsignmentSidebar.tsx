"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConsignmentFilters } from "@/lib/types/consignment";
import {
  CONSIGNMENT_STATUS,
  CONSIGNMENT_STATUS_LABELS,
  CONSIGNMENT_STATUS_COLOR,
} from "@/lib/types/consignment";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { FilterMultiSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { ChevronDown, X, Check } from "lucide-react";

interface ConsignmentSidebarProps {
  filters: ConsignmentFilters;
  setFilters: (filters: Partial<ConsignmentFilters>) => void;
}

const STATUS_VALUES = [
  CONSIGNMENT_STATUS.PENDING,
  CONSIGNMENT_STATUS.CONFIRMED,
  CONSIGNMENT_STATUS.PACKED,
  CONSIGNMENT_STATUS.LOADING,
  CONSIGNMENT_STATUS.DELIVERED,
  CONSIGNMENT_STATUS.PARTIALLY_INVOICED,
  CONSIGNMENT_STATUS.COMPLETED,
  CONSIGNMENT_STATUS.CANCELLED,
];

// Trạng thái mặc định (mirror DEFAULT_STATUS ở page) — dùng cho "Xóa tất cả".
const DEFAULT_STATUS = [
  CONSIGNMENT_STATUS.PENDING,
  CONSIGNMENT_STATUS.CONFIRMED,
  CONSIGNMENT_STATUS.PARTIALLY_INVOICED,
  CONSIGNMENT_STATUS.LOADING,
  CONSIGNMENT_STATUS.DELIVERED,
];

// Chấm tròn cùng tông với badge màu của từng trạng thái.
const STATUS_DOT: Record<number, string> = {
  [CONSIGNMENT_STATUS.PENDING]: "bg-gray-400",
  [CONSIGNMENT_STATUS.CONFIRMED]: "bg-blue-400",
  [CONSIGNMENT_STATUS.PACKED]: "bg-indigo-400",
  [CONSIGNMENT_STATUS.LOADING]: "bg-cyan-400",
  [CONSIGNMENT_STATUS.DELIVERED]: "bg-teal-500",
  [CONSIGNMENT_STATUS.PARTIALLY_INVOICED]: "bg-yellow-400",
  [CONSIGNMENT_STATUS.COMPLETED]: "bg-green-500",
  [CONSIGNMENT_STATUS.CANCELLED]: "bg-red-400",
};

// ─── MultiStatusDropdown (chip màu, mirror InvoicesSidebar) ──────────────────
function MultiStatusDropdown({
  values,
  placeholder,
  onChange,
}: {
  values: number[];
  placeholder: string;
  onChange: (v: number[]) => void;
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
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {values.length > 0 ? (
            values.map((v) => (
              <span
                key={v}
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${
                  CONSIGNMENT_STATUS_COLOR[v] ?? "bg-gray-100 text-gray-700"
                }`}>
                {CONSIGNMENT_STATUS_LABELS[v]}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {values.length > 0 && (
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
          {STATUS_VALUES.map((value, idx) => {
            const isSelected = values.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange(
                    isSelected
                      ? values.filter((v) => v !== value)
                      : [...values, value]
                  )
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                  isSelected ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    STATUS_DOT[value] ?? "bg-gray-400"
                  }`}
                />
                <span
                  className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    CONSIGNMENT_STATUS_COLOR[value] ?? "bg-gray-100 text-gray-700"
                  }`}>
                  {CONSIGNMENT_STATUS_LABELS[value]}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConsignmentSidebar({
  filters,
  setFilters,
}: ConsignmentSidebarProps) {
  const selectedStatuses = filters.status || [];
  const selectedBranchIds = filters.branchIds || [];

  const { data: branches } = useBranches();
  const branchOptions = useMemo(
    () =>
      (branches ?? [])
        .filter((b: any) => b.isActive)
        .map((b: any) => ({ value: String(b.id), label: b.name })),
    [branches]
  );

  const [dateRange, setDateRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "all_time",
    fromDate: "",
    toDate: "",
  });

  const handleDateChange = (next: TimeRangeState) => {
    setDateRange(next);
    const iso = rangeToIso(next);
    setFilters({ fromDate: iso?.from, toDate: iso?.to });
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (selectedStatuses.length > 0) n++;
    if (dateRange.selectedPreset !== "all_time" || dateRange.dateMode === "custom")
      n++;
    return n;
  }, [selectedBranchIds, selectedStatuses, dateRange]);

  const clearAll = () => {
    setDateRange({
      dateMode: "preset",
      selectedPreset: "all_time",
      fromDate: "",
      toDate: "",
    });
    setFilters({
      branchIds: undefined,
      status: DEFAULT_STATUS,
      fromDate: undefined,
      toDate: undefined,
    });
  };

  return (
    <aside className="hidden md:flex w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Ngày ký gửi ── */}
        <TimeRangeFilter
          label="Ngày ký gửi"
          value={dateRange}
          onChange={handleDateChange}
        />

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branchOptions}
            values={selectedBranchIds.map(String)}
            onChange={(vals) =>
              setFilters({
                branchIds: vals.length ? vals.map(Number) : undefined,
              })
            }
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <MultiStatusDropdown
            values={selectedStatuses}
            placeholder="Chọn trạng thái"
            onChange={(next) =>
              setFilters({ status: next.length ? next : undefined })
            }
          />
        </div>
      </div>
    </aside>
  );
}
