"use client";

import {
  BookOpen,
  ClipboardList,
  History,
  X,
} from "lucide-react";

export type ManufacturerView =
  | "info"
  | "debt"
  | "productions"
  | "costHistory";
export type ManufacturerStatus = "all" | "active" | "inactive";
export type ManufacturerBooleanFilter = "all" | "yes" | "no";

export const MANUFACTURER_VIEWS = [
  { value: "info", label: "Thông tin nhà sản xuất", icon: BookOpen },
  { value: "debt", label: "Công nợ nhà sản xuất", icon: ClipboardList },
  { value: "productions", label: "Phiếu gửi sản xuất", icon: ClipboardList },
  { value: "costHistory", label: "Lịch sử giá thành", icon: History },
] as const;

interface Props {
  status: ManufacturerStatus;
  onStatusChange: (value: ManufacturerStatus) => void;
  inProgress: ManufacturerBooleanFilter;
  onInProgressChange: (value: ManufacturerBooleanFilter) => void;
  debt: ManufacturerBooleanFilter;
  onDebtChange: (value: ManufacturerBooleanFilter) => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function ManufacturerSidebar({
  status,
  onStatusChange,
  inProgress,
  onInProgressChange,
  debt,
  onDebtChange,
  mobileOpen,
  onClose,
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
          <h1 className="text-base font-semibold text-gray-800">
            Nhà sản xuất
          </h1>
          <button
            type="button"
            title="Đóng bộ lọc"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>
        <div className="custom-sidebar-scroll flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <label
              htmlFor="manufacturer-status"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Trạng thái hoạt động
            </label>
            <select
              id="manufacturer-status"
              value={status}
              onChange={(event) =>
                onStatusChange(event.target.value as ManufacturerStatus)
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="manufacturer-in-progress"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Đang gia công
            </label>
            <select
              id="manufacturer-in-progress"
              value={inProgress}
              onChange={(event) =>
                onInProgressChange(
                  event.target.value as ManufacturerBooleanFilter,
                )
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="all">Tất cả</option>
              <option value="yes">Đang có hàng gia công</option>
              <option value="no">Không có</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="manufacturer-debt"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Công nợ sản xuất
            </label>
            <select
              id="manufacturer-debt"
              value={debt}
              onChange={(event) =>
                onDebtChange(event.target.value as ManufacturerBooleanFilter)
              }
              className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="all">Tất cả</option>
              <option value="yes">Còn nợ</option>
              <option value="no">Không nợ</option>
            </select>
          </div>
        </div>
      </aside>
    </>
  );
}
