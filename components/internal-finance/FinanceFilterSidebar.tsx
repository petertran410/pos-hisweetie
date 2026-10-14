"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Khung sidebar bộ lọc của các trang tài chính, theo đúng giao diện sidebar
 * hóa đơn: thẻ trắng bo góc, tiêu đề "Bộ lọc" và nút "Xóa tất cả".
 * Truyền `onMobileClose` để sidebar thành ngăn kéo trên màn hình nhỏ.
 */
export function FinanceFilterSidebar({
  activeCount,
  onClear,
  children,
  mobileOpen,
  onMobileClose,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const drawer = Boolean(onMobileClose);
  return (
    <>
      {drawer && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={
          drawer
            ? `custom-sidebar-scroll z-40 min-h-0 w-64 shrink-0 flex-col overflow-y-auto border bg-white shadow-xl md:static md:m-4 md:flex md:h-[calc(100%-2rem)] md:rounded-xl ${
                mobileOpen ? "fixed inset-y-0 left-0 flex" : "hidden"
              }`
            : "custom-sidebar-scroll m-4 flex h-[calc(100%-2rem)] min-h-0 w-64 shrink-0 flex-col overflow-y-auto rounded-xl border bg-white shadow-xl"
        }>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-2 md:rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-sm font-medium text-brand hover:text-brand-dark">
                Xóa tất cả
              </button>
            )}
            {drawer && (
              <button
                type="button"
                title="Đóng bộ lọc"
                onClick={onMobileClose}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 md:hidden">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </aside>
    </>
  );
}

export function FilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export const FilterDivider = () => (
  <div className="border-t border-gray-100" />
);
