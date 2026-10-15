"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

/**
 * Khung trang tài chính trên điện thoại (theo kiểu Hóa đơn): ô tìm kiếm + nút
 * bộ lọc, dải tóm tắt, danh sách thẻ, phân trang gọn và nút "+" tạo phiếu.
 */
export function FinanceMobileShell({
  title,
  search,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  activeFilterCount = 0,
  onOpenFilter,
  actions,
  tabs,
  summary,
  isLoading,
  isEmpty,
  emptyText = "Không có dữ liệu",
  page,
  totalPages,
  onPageChange,
  onCreate,
  children,
}: {
  title: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  activeFilterCount?: number;
  onOpenFilter?: () => void;
  /** Nút phụ cạnh tiêu đề (link sang trang khác…). */
  actions?: ReactNode;
  /** Dải tab ngang ngay dưới ô tìm kiếm. */
  tabs?: ReactNode;
  summary?: ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
  emptyText?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onCreate?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50">
      <div className="shrink-0 bg-white px-4 pb-3 pt-3 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h1 className="truncate text-base font-semibold text-gray-900">
            {title}
          </h1>
          {actions && (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          )}
        </div>
        {(onSearchChange || onOpenFilter) && (
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search || ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-8 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {search && (
                  <button
                    type="button"
                    title="Xóa tìm kiếm"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {onOpenFilter && (
              <button
                type="button"
                title="Bộ lọc"
                onClick={onOpenFilter}
                className={`relative shrink-0 rounded-xl p-2.5 ${
                  activeFilterCount > 0
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600"
                }`}>
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
        {tabs && <div className="-mx-4 mt-2.5 px-4">{tabs}</div>}
      </div>
      {summary && (
        <div className="shrink-0 border-b bg-white px-4 py-2 text-sm">
          {summary}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : isEmpty ? (
          <div className="py-20 text-center text-sm text-gray-400">
            {emptyText}
          </div>
        ) : (
          <>
            {children}
            {onPageChange && totalPages && totalPages > 1 && page ? (
              <div className="flex items-center justify-center gap-3 py-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="flex items-center gap-1 rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <span className="text-sm font-medium text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="flex items-center gap-1 rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40">
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {onCreate && (
        <button
          type="button"
          title="Tạo mới"
          onClick={onCreate}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl active:scale-95">
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}

/** Thẻ một dòng dữ liệu trên điện thoại. */
export function FinanceMobileCard({
  code,
  badge,
  title,
  meta,
  amount,
  amountTone = "neutral",
  muted,
  highlight,
  onClick,
  children,
}: {
  code: ReactNode;
  badge?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  amount?: ReactNode;
  amountTone?: "positive" | "negative" | "neutral";
  /** Phiếu đã hủy: làm mờ. */
  muted?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  /** Hàng thao tác dưới đáy thẻ. */
  children?: ReactNode;
}) {
  const tone =
    amountTone === "positive"
      ? "text-green-600"
      : amountTone === "negative"
        ? "text-red-600"
        : "text-gray-900";
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border bg-white p-3.5 shadow-sm ${
        highlight ? "border-brand ring-2 ring-brand-soft" : "border-gray-100"
      } ${muted ? "opacity-60" : ""} ${onClick ? "cursor-pointer active:scale-[0.99]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-mono text-[13px] font-semibold text-brand">
          {code}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {title && (
        <div className="mt-1 break-words text-sm font-medium text-gray-900">
          {title}
        </div>
      )}
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5 text-xs text-gray-500">{meta}</div>
        {amount !== undefined && (
          <div className={`shrink-0 text-base font-semibold ${tone}`}>
            {amount}
          </div>
        )}
      </div>
      {children && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed pt-3"
          onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Bọc sidebar bộ lọc thành ngăn kéo trên điện thoại (vẫn giữ mounted). */
export function MobileFilterDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={open ? "fixed inset-0 z-40 flex" : "hidden"}>
      <div className="flex h-full w-[min(20rem,85vw)] flex-col bg-gray-50 shadow-2xl">
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Xem kết quả
          </button>
        </div>
        <div className="flex min-h-0 flex-1 [&>aside]:m-2 [&>aside]:h-[calc(100%-1rem)] [&>aside]:w-auto [&>aside]:flex-1">
          {children}
        </div>
      </div>
      <div className="flex-1 bg-black/40" onClick={onClose} />
    </div>
  );
}

/** Nút thao tác nhỏ trong thẻ. */
export function CardAction({
  onClick,
  children,
  tone = "default",
  disabled,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "danger" | "primary";
  disabled?: boolean;
  title?: string;
}) {
  const style =
    tone === "danger"
      ? "border-red-200 text-red-600"
      : tone === "primary"
        ? "border-brand bg-brand text-white"
        : "text-gray-700";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${style}`}>
      {children}
    </button>
  );
}
