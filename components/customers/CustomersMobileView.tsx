"use client";

import { useState, useEffect, useMemo } from "react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useCustomerGroups } from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";
import type { Customer, CustomerFilters } from "@/lib/types/customer";
import { useCan } from "@/lib/hooks/useCan";
import { PermissionGate } from "../permissions/PermissionGate";
import {
  Search,
  Plus,
  SlidersHorizontal,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Phone,
  User,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";

// --- Constants ---
const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng HĐ" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Mới nhất" },
  { value: "createdAt_asc", label: "Cũ nhất" },
  { value: "totalPurchased_desc", label: "Mua nhiều nhất" },
  { value: "totalPurchased_asc", label: "Mua ít nhất" },
  { value: "totalDebt_desc", label: "Nợ nhiều nhất" },
  { value: "totalDebt_asc", label: "Nợ ít nhất" },
];

// --- CustomerMobileCard ---
function CustomerMobileCard({
  customer,
  onClick,
  canViewDebt,
}: {
  customer: Customer;
  onClick: () => void;
  canViewDebt: boolean;
}) {
  const debt = Number(customer.totalDebt);
  const totalPurchased = Number(customer.totalPurchased);
  const totalRevenue = Number(customer.totalRevenue);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none"
    >
      {/* Row 1: code + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-blue-600 font-bold text-[15px]">
          <CodeLink entity="customer" code={customer.code} />
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            customer.isActive
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          {customer.isActive ? "Hoạt động" : "Ngừng HĐ"}
        </span>
      </div>

      {/* Row 2: customer name */}
      <p className="font-semibold text-gray-900 text-sm leading-tight mb-2">
        {customer.name}
      </p>

      {/* Row 3: phone */}
      {(customer.contactNumber || customer.phone) && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Phone className="w-3.5 h-3.5" />
          <span>{customer.contactNumber || customer.phone}</span>
        </div>
      )}

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 mb-3" />

      {/* Row 4: financial summary */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">
              Tổng mua
            </p>
            <p className="text-sm font-semibold text-gray-700 leading-none">
              {formatCurrency(totalPurchased)}
            </p>
          </div>
          {canViewDebt && debt > 0 && (
            <div>
              <p className="text-xs text-gray-400 leading-none mb-0.5">
                Công nợ
              </p>
              <p className="text-sm font-semibold text-orange-500 leading-none">
                {formatCurrency(debt)}
              </p>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 leading-none mb-0.5">
            Doanh thu
          </p>
          <p className="text-base font-bold text-gray-900 leading-none">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- CustomerMobileDetailSheet ---
function CustomerMobileDetailSheet({
  customer,
  onClose,
  onEdit,
  canViewDebt,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  canViewDebt: boolean;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const defaultAddr =
    customer.addresses?.find((a) => a.isDefault) || customer.addresses?.[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex-1 flex flex-col bg-white mt-10 rounded-t-3xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-base">
              <CodeLink entity="customer" code={customer.code} />
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                customer.isActive
                  ? "bg-green-50 text-green-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {customer.isActive ? "Hoạt động" : "Ngừng HĐ"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Customer info card */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-base truncate">
                  {customer.name}
                </p>
                <p className="text-xs text-gray-500">
                  {customer.type === 0 ? "Cá nhân" : "Công ty"}
                  {customer.organization && ` · ${customer.organization}`}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {(customer.contactNumber || customer.phone) && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {customer.contactNumber || customer.phone}
                  </span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs w-4 text-center">@</span>
                  <span className="text-gray-700">{customer.email}</span>
                </div>
              )}
              {defaultAddr?.address && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-400 text-xs w-4 text-center mt-0.5">📍</span>
                  <span className="text-gray-700">
                    {[
                      defaultAddr.address,
                      defaultAddr.wardName || defaultAddr.newWardName,
                      defaultAddr.cityName || defaultAddr.newCityName,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financial info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin tài chính
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Tổng mua</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(Number(customer.totalPurchased))}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Doanh thu</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(Number(customer.totalRevenue))}
                </p>
              </div>
              {canViewDebt && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Công nợ</p>
                  <p
                    className={`text-sm font-bold ${
                      Number(customer.totalDebt) > 0
                        ? "text-orange-600"
                        : "text-gray-400"
                    }`}
                  >
                    {formatCurrency(Number(customer.totalDebt))}
                  </p>
                </div>
              )}
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Tổng HĐ</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(Number(customer.totalInvoiced))}
                </p>
              </div>
            </div>
          </div>

          {/* Groups */}
          {customer.customerGroupDetails &&
            customer.customerGroupDetails.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Nhóm khách hàng
                </p>
                <div className="flex flex-wrap gap-2">
                  {customer.customerGroupDetails.map((gd) => (
                    <span
                      key={gd.id}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                    >
                      {gd.customerGroup.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Branch */}
          {customer.branch && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Chi nhánh
              </p>
              <p className="text-sm text-gray-700">{customer.branch.name}</p>
            </div>
          )}

          <div className="h-4" />
        </div>

        {/* Footer actions */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
          <PermissionGate resource="customers" action="update">
            <button
              onClick={() => onEdit(customer)}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Chỉnh sửa khách hàng
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}

// --- CustomersMobileFilterSheet ---
function CustomersMobileFilterSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: CustomerFilters;
  onApply: (f: CustomerFilters) => void;
  onClose: () => void;
}) {
  const [localStatus, setLocalStatus] = useState<string>(
    filters.isActive === true
      ? "active"
      : filters.isActive === false
        ? "inactive"
        : "all"
  );
  const [localSort, setLocalSort] = useState<string>(
    `${filters.orderBy || "createdAt"}_${filters.orderDirection || "desc"}`
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleApply = () => {
    const [orderBy, orderDirection] = localSort.split("_") as [
      string,
      "asc" | "desc",
    ];
    const newFilters: CustomerFilters = {
      pageSize: 15,
      currentItem: 0,
      orderBy,
      orderDirection,
    };
    if (localStatus === "active") newFilters.isActive = true;
    else if (localStatus === "inactive") newFilters.isActive = false;
    else newFilters.includeInactive = true; // "all" → lấy cả KH hoạt động & ngừng HĐ
    onApply(newFilters);
  };

  const handleReset = () => {
    setLocalStatus("all");
    setLocalSort("createdAt_desc");
  };

  const activeCount = [
    localStatus !== "all" ? localStatus : "",
    localSort !== "createdAt_desc" ? localSort : "",
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Bộ lọc</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Xóa tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Trạng thái
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Tất cả" },
                { value: "active", label: "Hoạt động" },
                { value: "inactive", label: "Ngừng HĐ" },
              ].map((opt) => {
                const isActive = localStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLocalStatus(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Sắp xếp
            </p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => {
                const isActive = localSort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLocalSort(opt.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleApply}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Export: CustomersMobileView ---
interface CustomersMobileViewProps {
  filters: CustomerFilters;
  onFiltersChange: (f: CustomerFilters) => void;
  onCreateClick: () => void;
  onEditClick: (customer: Customer) => void;
}

export function CustomersMobileView({
  filters,
  onFiltersChange,
  onCreateClick,
  onEditClick,
}: CustomersMobileViewProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showFilter, setShowFilter] = useState(false);
  const limit = 20;

  const canViewDebt = useCan("customers", "view_debt");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter/search/tab change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeTab]);

  const effectiveFilters: CustomerFilters = useMemo(() => {
    const f = { ...filters };
    if (activeTab === "active") f.isActive = true;
    else if (activeTab === "inactive") f.isActive = false;
    else delete f.isActive;
    return f;
  }, [filters, activeTab]);

  const { data, isLoading } = useCustomers({
    ...effectiveFilters,
    name: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const customers: Customer[] = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.isActive !== undefined) count++;
    if (
      filters.orderBy &&
      filters.orderBy !== "createdAt" &&
      filters.orderDirection !== "desc"
    )
      count++;
    return count;
  }, [filters]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header: search + filter icon */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã, tên, SĐT..."
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(true)}
            className={`relative p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              activeFilterCount > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <SlidersHorizontal
              className={`w-5 h-5 ${activeFilterCount > 0 ? "text-white" : "text-gray-600"}`}
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] px-0.5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none h-[18px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Status tabs */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <User className="w-12 h-12 text-gray-200 mb-3" />
            <span className="text-gray-400 text-sm">
              Không tìm thấy khách hàng nào
            </span>
          </div>
        ) : (
          <>
            {/* Result count */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-400">
                {total} khách hàng
              </span>
            </div>

            {customers.map((customer) => (
              <CustomerMobileCard
                key={customer.id}
                customer={customer}
                canViewDebt={canViewDebt}
                onClick={() => setSelectedCustomer(customer)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB - Create customer */}
      <PermissionGate resource="customers" action="create">
        <button
          onClick={onCreateClick}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </PermissionGate>

      {/* Detail sheet */}
      {selectedCustomer && (
        <CustomerMobileDetailSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(c) => {
            setSelectedCustomer(null);
            onEditClick(c);
          }}
          canViewDebt={canViewDebt}
        />
      )}

      {/* Filter sheet */}
      {showFilter && (
        <CustomersMobileFilterSheet
          filters={filters}
          onApply={(f) => {
            onFiltersChange(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
