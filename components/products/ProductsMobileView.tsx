"use client";

import { useState, useEffect, useMemo } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/api/products";
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  Tag,
  Box,
} from "lucide-react";
import { ProductMobileDetailSheet } from "./ProductMobileDetailSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
] as const;

const STOCK_OPTIONS = [
  { value: "instock", label: "Còn hàng" },
  { value: "outstock", label: "Hết hàng" },
];

const DIRECT_SALE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

const getProductTypeLabel = (type: number) => {
  switch (type) {
    case 1:
      return "Combo";
    case 2:
      return "Hàng hóa";
    case 3:
      return "Dịch vụ";
    case 4:
      return "Sản xuất";
    default:
      return "Hàng hóa";
  }
};

const getProductTypeBadge = (type: number) => {
  switch (type) {
    case 1:
      return "bg-purple-100 text-purple-700";
    case 2:
      return "bg-blue-100 text-blue-700";
    case 3:
      return "bg-amber-100 text-amber-700";
    case 4:
      return "bg-teal-100 text-teal-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// ─── ProductMobileCard ────────────────────────────────────────────────────────

function ProductMobileCard({
  product,
  branchId,
  onClick,
}: {
  product: Product;
  branchId?: number;
  onClick: () => void;
}) {
  const inventory = product.inventories?.find(
    (inv) => inv.branchId === branchId
  );
  const stock = inventory ? inventory.onHand : 0;
  const cost = inventory ? Number(inventory.cost) : 0;
  const basePrice = Number(product.basePrice);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none">
      {/* Row 1: Image + Info */}
      <div className="flex gap-3">
        {/* Product image */}
        <div className="flex-shrink-0">
          {product.images?.[0] ? (
            <img
              src={product.images[0].image}
              alt={product.name}
              className="w-14 h-14 object-cover rounded-xl border border-gray-100"
            />
          ) : (
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          {/* Code + Status */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-blue-600 font-bold text-[13px]">
              {product.code}
            </span>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                product.isActive ? "bg-green-500" : "bg-red-400"
              }`}
            />
          </div>

          {/* Name */}
          <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1.5">
            {product.name}
          </p>

          {/* Type badge + Category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getProductTypeBadge(product.type)}`}>
              {getProductTypeLabel(product.type)}
            </span>
            {product.parentName && (
              <span className="text-[11px] text-gray-400 truncate">
                {product.parentName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 my-3" />

      {/* Row 2: Price + Stock */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div>
            <p className="text-[11px] text-gray-400 leading-none mb-0.5">
              Giá bán
            </p>
            <p className="text-sm font-bold text-gray-900 leading-none">
              {formatCurrency(basePrice)} đ
            </p>
          </div>
          {cost > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 leading-none mb-0.5">
                Giá vốn
              </p>
              <p className="text-sm font-semibold text-gray-500 leading-none">
                {formatCurrency(cost)} đ
              </p>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 leading-none mb-0.5">
            Tồn kho
          </p>
          <p
            className={`text-base font-bold leading-none ${
              stock > 0 ? "text-green-600" : "text-red-500"
            }`}>
            {stock}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ProductsMobileFilterSheet ────────────────────────────────────────────────

function ProductsMobileFilterSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: any;
  onApply: (f: any) => void;
  onClose: () => void;
}) {
  const { data: parentCategories } = useCategories("parent");
  const { data: middleCategories } = useCategories("middle");
  const { data: childCategories } = useCategories("child");
  const { data: trademarks } = useTrademarks();

  const [localParentName, setLocalParentName] = useState<string>(
    filters.parentName || ""
  );
  const [localMiddleName, setLocalMiddleName] = useState<string>(
    filters.middleName || ""
  );
  const [localChildName, setLocalChildName] = useState<string>(
    filters.childName || ""
  );
  const [localStockStatus, setLocalStockStatus] = useState<string>(
    filters.stockStatus || ""
  );
  const [localTradeMarkId, setLocalTradeMarkId] = useState<string>(
    filters.tradeMarkId ? String(filters.tradeMarkId) : ""
  );
  const [localDirectSale, setLocalDirectSale] = useState<string>(
    filters.isDirectSale === true
      ? "yes"
      : filters.isDirectSale === false
        ? "no"
        : ""
  );

  const parentOptions = useMemo(
    () =>
      (parentCategories || [])
        .filter((c: any) => c.type === "parent")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [parentCategories]
  );

  const middleOptions = useMemo(
    () =>
      (middleCategories || [])
        .filter((c: any) => c.type === "middle")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [middleCategories]
  );

  const childOptions = useMemo(
    () =>
      (childCategories || [])
        .filter((c: any) => c.type === "child")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [childCategories]
  );

  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: any) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleApply = () => {
    const f: any = {};
    if (localParentName) f.parentName = localParentName;
    if (localMiddleName) f.middleName = localMiddleName;
    if (localChildName) f.childName = localChildName;
    if (localStockStatus) f.stockStatus = localStockStatus;
    if (localTradeMarkId) f.tradeMarkId = Number(localTradeMarkId);
    if (localDirectSale === "yes") f.isDirectSale = true;
    if (localDirectSale === "no") f.isDirectSale = false;
    onApply(f);
  };

  const handleReset = () => {
    setLocalParentName("");
    setLocalMiddleName("");
    setLocalChildName("");
    setLocalStockStatus("");
    setLocalTradeMarkId("");
    setLocalDirectSale("");
  };

  const activeCount = [
    localParentName,
    localMiddleName,
    localChildName,
    localStockStatus,
    localTradeMarkId,
    localDirectSale,
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
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
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                Xóa tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Loại Hàng */}
          {parentOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                Loại Hàng
              </p>
              <div className="flex flex-wrap gap-2">
                {parentOptions.map((opt: { value: string; label: string }) => {
                  const isActive = localParentName === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setLocalParentName(isActive ? "" : opt.value)
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nguồn Gốc */}
          {middleOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                Nguồn Gốc
              </p>
              <div className="flex flex-wrap gap-2">
                {middleOptions.map((opt: { value: string; label: string }) => {
                  const isActive = localMiddleName === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setLocalMiddleName(isActive ? "" : opt.value)
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Danh Mục */}
          {childOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                Danh Mục
              </p>
              <div className="flex flex-wrap gap-2">
                {childOptions.map((opt: { value: string; label: string }) => {
                  const isActive = localChildName === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setLocalChildName(isActive ? "" : opt.value)
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tồn kho */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Tồn kho
            </p>
            <div className="flex flex-wrap gap-2">
              {STOCK_OPTIONS.map((opt) => {
                const isActive = localStockStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setLocalStockStatus(isActive ? "" : opt.value)
                    }
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thương hiệu */}
          {trademarkOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                Thương hiệu
              </p>
              <div className="flex flex-wrap gap-2">
                {trademarkOptions.map(
                  (opt: { value: string; label: string }) => {
                    const isActive = localTradeMarkId === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setLocalTradeMarkId(isActive ? "" : opt.value)
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}>
                        {isActive && <Check className="w-3.5 h-3.5" />}
                        {opt.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Bán trực tiếp */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              Bán trực tiếp
            </p>
            <div className="flex flex-wrap gap-2">
              {DIRECT_SALE_OPTIONS.map((opt) => {
                const isActive = localDirectSale === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setLocalDirectSale(isActive ? "" : opt.value)
                    }
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}>
                    {isActive && <Check className="w-3.5 h-3.5" />}
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
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProductsMobileView (main export) ─────────────────────────────────────────

interface ProductsMobileViewProps {
  filters: any;
  onFiltersChange: (f: any) => void;
  codeFilter?: string;
}

export function ProductsMobileView({
  filters,
  onFiltersChange,
  codeFilter,
}: ProductsMobileViewProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState(codeFilter || "");
  const [debouncedSearch, setDebouncedSearch] = useState(codeFilter || "");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const limit = 20;

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter / search / tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeTab]);

  // Build query params
  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit,
      branchId: selectedBranch?.id,
      ...filters,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeTab === "active") params.isActive = true;
    if (activeTab === "inactive") params.isActive = false;
    return params;
  }, [page, limit, selectedBranch?.id, filters, debouncedSearch, activeTab]);

  const { data, isLoading } = useProducts(queryParams);

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const activeFilterCount = [
    filters.parentName,
    filters.middleName,
    filters.childName,
    filters.stockStatus,
    filters.tradeMarkId,
    filters.isDirectSale !== undefined ? "yes" : "",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ─── Header: search + filter icon ─── */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã, tên sản phẩm..."
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
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
            }`}>
            <SlidersHorizontal
              className={`w-5 h-5 ${activeFilterCount > 0 ? "text-white" : "text-gray-600"}`}
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-0.5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Status tabs — horizontal scroll */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
                }`}>
                {tab.label}
              </button>
            );
          })}
          {total > 0 && (
            <span className="flex-shrink-0 px-3 py-1.5 text-sm text-gray-400 font-medium">
              ({total} sản phẩm)
            </span>
          )}
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Box className="w-12 h-12 text-gray-200" />
            <span className="text-gray-400 text-sm">
              Không tìm thấy sản phẩm nào
            </span>
          </div>
        ) : (
          <>
            {products.map((product) => (
              <ProductMobileCard
                key={product.id}
                product={product}
                branchId={selectedBranch?.id}
                onClick={() => setSelectedProductId(product.id)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Filter bottom sheet ─── */}
      {showFilter && (
        <ProductsMobileFilterSheet
          filters={filters}
          onApply={(f) => {
            onFiltersChange(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ─── Detail bottom sheet ─── */}
      {selectedProductId !== null && (
        <ProductMobileDetailSheet
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
}
