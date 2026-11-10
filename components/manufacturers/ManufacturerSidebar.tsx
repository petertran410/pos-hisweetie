"use client";

import { BookOpen, ClipboardList, FlaskConical, Search, X } from "lucide-react";
import { PartnerPicker } from "./ProductionPickers";

export type ManufacturerView = "info" | "debt" | "productions" | "templates";

export const MANUFACTURER_VIEWS = [
  { value: "info", label: "Thông tin nhà sản xuất", icon: BookOpen },
  { value: "debt", label: "Công nợ nhà sản xuất", icon: ClipboardList },
  { value: "productions", label: "Phiếu gửi sản xuất", icon: ClipboardList },
  { value: "templates", label: "Mẫu phối trộn", icon: FlaskConical },
] as const;

interface Props {
  view: ManufacturerView;
  onViewChange: (value: ManufacturerView) => void;
  search: string;
  onSearchChange: (value: string) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (value: boolean) => void;
  selected: number | null;
  onSelect: (id: number | null) => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function ManufacturerSidebar({
  view, onViewChange, search, onSearchChange, includeInactive,
  onIncludeInactiveChange, selected, onSelect, mobileOpen, onClose,
}: Props) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng bộ lọc nhà sản xuất"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Bộ lọc nhà sản xuất"
        className={`${mobileOpen ? "fixed bottom-3 left-3 top-20 z-50 flex" : "hidden"} w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl lg:static lg:z-auto lg:m-4 lg:flex lg:max-h-full`}
      >
        <div className="flex min-h-11 shrink-0 items-center justify-between border-b px-4 py-2">
          <h1 className="text-base font-semibold text-gray-800">Nhà sản xuất</h1>
          <button type="button" title="Đóng bộ lọc" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden">
            <X size={16} />
          </button>
        </div>
        <div className="custom-sidebar-scroll flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Nội dung</p>
            <nav aria-label="Nội dung nhà sản xuất" className="space-y-1">
              {MANUFACTURER_VIEWS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => { onViewChange(value); onClose(); }}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                    view === value
                      ? "border-brand bg-brand font-medium text-white shadow-sm"
                      : "border-gray-200 text-gray-700 hover:bg-brand-soft"
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <label htmlFor="manufacturer-search" className="mb-1.5 block text-sm font-medium text-gray-700">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" />
              <input
                id="manufacturer-search"
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Mã hoặc tên nhà sản xuất"
                className="w-full min-w-0 rounded-lg border border-gray-200 py-2 pl-8 pr-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Nhà sản xuất</p>
            <PartnerPicker manufacturer label="Chọn nhà sản xuất" value={selected} onChange={(id) => { onSelect(id); onClose(); }} />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-gray-700">Trạng thái</legend>
            <div className="space-y-2 text-sm text-gray-600">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="manufacturer-status" checked={!includeInactive} onChange={() => onIncludeInactiveChange(false)} className="accent-brand" />
                Đang hoạt động
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="manufacturer-status" checked={includeInactive} onChange={() => onIncludeInactiveChange(true)} className="accent-brand" />
                Tất cả trạng thái
              </label>
            </div>
          </fieldset>
          {(search || includeInactive || selected) && (
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand"
              onClick={() => { onSearchChange(""); onIncludeInactiveChange(false); onSelect(null); }}
            >
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
