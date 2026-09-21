"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useCustomerDemandCustomers } from "@/lib/hooks/useCustomerDemand";
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
    value: "DRAFT",
    label: "Chờ duyệt",
    className: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "CONFIRMED",
    label: "Đã duyệt",
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
  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(customerQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        customerRef.current &&
        !customerRef.current.contains(event.target as Node)
      ) {
        setCustomerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const { data: customerData } = useCustomerDemandCustomers(
    debouncedQuery.length >= 2 ? debouncedQuery : undefined
  );
  const customers = useMemo(
    () => (Array.isArray(customerData) ? customerData : []),
    [customerData]
  );

  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === filters.customerId),
    [customers, filters.customerId]
  );

  const activeFilterCount =
    Number(!!filters.customerId) +
    Number(!!filters.month) +
    Number(!!filters.status) +
    Number(
      filters.sortBy !== "createdAt" || filters.sortOrder === "asc"
    );

  const patchFilters = (patch: Partial<CustomerDemandFilters>) => {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  };

  const clearAll = () => {
    setCustomerQuery("");
    setCustomerOpen(false);
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
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => patchFilters({ status: undefined })}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                !filters.status
                  ? "border-brand bg-brand-soft text-gray-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}>
              <span className="flex-1">Tất cả trạng thái</span>
              {!filters.status && <Check className="h-3.5 w-3.5 text-brand" />}
            </button>
            {STATUS_OPTIONS.map((option) => {
              const active = filters.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    patchFilters({
                      status: active ? undefined : option.value,
                    })
                  }
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`}
                  />
                  <span
                    className={`flex-1 rounded-full px-2 py-0.5 text-xs font-medium ${option.className}`}>
                    {option.label}
                  </span>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={customerRef} className="relative">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Khách hàng
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={customerQuery}
              onChange={(event) => {
                if (filters.customerId) {
                  patchFilters({ customerId: undefined });
                }
                setCustomerQuery(event.target.value);
                setCustomerOpen(true);
              }}
              onFocus={() => setCustomerOpen(true)}
              placeholder="Tìm mã hoặc tên khách..."
              className="w-full rounded-lg border bg-white py-2 pl-9 pr-8 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            {filters.customerId && (
              <button
                type="button"
                onClick={() => patchFilters({ customerId: undefined })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700"
                aria-label="Bỏ lọc khách hàng">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filters.customerId && (
            <div className="mt-2 rounded-lg bg-brand-soft px-2.5 py-2 text-xs font-medium text-gray-700">
              {selectedCustomer
                ? `${selectedCustomer.code ? `${selectedCustomer.code} · ` : ""}${selectedCustomer.name}`
                : `Khách hàng #${filters.customerId}`}
            </div>
          )}

          {customerOpen &&
            !filters.customerId &&
            debouncedQuery.length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white p-1.5 shadow-xl">
                {customers.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-gray-400">
                    Không tìm thấy khách hàng
                  </div>
                ) : (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        patchFilters({ customerId: customer.id });
                        setCustomerQuery(customer.name);
                        setCustomerOpen(false);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-soft">
                      <span className="block font-medium">
                        {customer.name}
                      </span>
                      {customer.code && (
                        <span className="mt-0.5 block text-[11px] text-gray-400">
                          {customer.code}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tháng cần hàng
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="month"
              value={filters.month ?? ""}
              onChange={(event) =>
                patchFilters({ month: event.target.value || undefined })
              }
              className="w-full rounded-lg border bg-white py-2 pl-9 pr-8 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            {filters.month && (
              <button
                type="button"
                onClick={() => patchFilters({ month: undefined })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700"
                aria-label="Bỏ lọc tháng">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Sắp xếp
          </label>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <select
                value={filters.sortBy ?? "createdAt"}
                onChange={(event) =>
                  patchFilters({
                    sortBy: event.target.value as CustomerDemandSortBy,
                    sortOrder:
                      event.target.value === "customerName" ? "asc" : "desc",
                  })
                }
                className="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
