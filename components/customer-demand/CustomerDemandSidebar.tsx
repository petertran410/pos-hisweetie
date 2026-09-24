"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  RotateCcw,
  X,
} from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { SimpleDropdown } from "@/components/shared/SimpleDropdown";
import type {
  CustomerDemandFilters,
  CustomerDemandSortBy,
  CustomerDemandStatus,
} from "@/lib/types/customer-demand";

const STATUS_OPTIONS: Array<{
  value: CustomerDemandStatus;
  label: string;
  className: string;
  dot: string;
}> = [
  {
    value: "CONFIRMED",
    label: "Hoàn thành",
    className: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    value: "CANCELLED",
    label: "Đã hủy",
    className: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const SORT_OPTIONS: Array<{ value: CustomerDemandSortBy; label: string }> = [
  { value: "createdAt", label: "Ngày tạo" },
  { value: "updatedAt", label: "Ngày cập nhật" },
  { value: "customerName", label: "Tên khách hàng" },
  { value: "id", label: "Mã phiếu" },
];

function StatusDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: typeof STATUS_OPTIONS;
  value: CustomerDemandStatus | "";
  placeholder: string;
  onChange: (value: CustomerDemandStatus | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setOpen((current) => !current);
        }}
        className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-sm transition-colors ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        }`}>
        <div className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`}
              />
              <span
                className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${selected.className}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(value === option.value ? "" : option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                value === option.value ? "bg-brand-soft" : "hover:bg-gray-50"
              } ${index > 0 ? "border-t border-gray-50" : ""}`}>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`}
              />
              <span
                className={`flex-1 rounded-full px-2 py-0.5 text-xs font-medium ${option.className}`}>
                {option.label}
              </span>
              {value === option.value && (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CustomerDemandSidebarProps {
  filters: CustomerDemandFilters;
  onFiltersChange: (filters: CustomerDemandFilters) => void;
  onClose?: () => void;
}

export function CustomerDemandSidebar({
  filters,
  onFiltersChange,
  onClose,
}: CustomerDemandSidebarProps) {

  const activeFilterCount =
    Number(!!filters.customerId) +
    Number(!!filters.month || !!filters.monthFrom || !!filters.monthTo) +
    Number(!!filters.status) +
    Number(
      filters.sortBy !== "createdAt" || filters.sortOrder === "asc"
    );

  const patchFilters = (patch: Partial<CustomerDemandFilters>) => {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  };

  const clearAll = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit ?? 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return (
    <aside className="m-4 flex w-64 shrink-0 flex-col rounded-xl border bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark">
              <RotateCcw className="h-3.5 w-3.5" />
              Xóa
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Đóng bộ lọc">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="custom-sidebar-scroll flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Trạng thái
          </label>
          <StatusDropdown
            options={STATUS_OPTIONS}
            value={filters.status ?? ""}
            placeholder="Tất cả trạng thái"
            onChange={(value) =>
              patchFilters({
                status: value || undefined,
              })
            }
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tháng cần hàng
          </label>
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5">
            <div>
              <span className="mb-1 block text-xs text-gray-500">
                Từ tháng
              </span>
              <DatePickerInput
                monthOnly
                value={
                  filters.monthFrom ? `${filters.monthFrom}-01` : ""
                }
                onChange={(value) => {
                  const monthFrom = value ? value.slice(0, 7) : undefined;
                  patchFilters({
                    monthFrom,
                    month: undefined,
                    ...(monthFrom &&
                    filters.monthTo &&
                    filters.monthTo < monthFrom
                      ? { monthTo: undefined }
                      : {}),
                  });
                }}
                placeholder="Chọn tháng"
                className={`flex w-full items-center justify-between border rounded-lg px-2 py-1.5 text-sm text-left transition-colors ${
                  filters.monthFrom
                    ? "border-brand bg-brand-soft text-gray-800"
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                }`}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-gray-500">
                Đến tháng
              </span>
              <DatePickerInput
                monthOnly
                value={filters.monthTo ? `${filters.monthTo}-01` : ""}
                minDate={
                  filters.monthFrom
                    ? `${filters.monthFrom}-01`
                    : undefined
                }
                onChange={(value) =>
                  patchFilters({
                    monthTo: value ? value.slice(0, 7) : undefined,
                    month: undefined,
                  })
                }
                placeholder="Chọn tháng"
                className={`flex w-full items-center justify-between border rounded-lg px-2 py-1.5 text-sm text-left transition-colors ${
                  filters.monthTo
                    ? "border-brand bg-brand-soft text-gray-800"
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                }`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Sắp xếp
          </label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SimpleDropdown
                options={SORT_OPTIONS}
                value={filters.sortBy ?? "createdAt"}
                placeholder="Ngày tạo"
                onChange={(value) => {
                  if (!value) return;
                  const sortBy = value as CustomerDemandSortBy;
                  patchFilters({
                    sortBy,
                    sortOrder: sortBy === "customerName" ? "asc" : "desc",
                  });
                }}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                patchFilters({
                  sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
                })
              }
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              title={
                filters.sortOrder === "asc" ? "Tăng dần" : "Giảm dần"
              }>
              {filters.sortOrder === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
