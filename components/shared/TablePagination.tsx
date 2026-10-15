"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/** Chân bảng phân trang kiểu trang Hóa đơn: số dòng/trang, các nút trang, tổng. */
export function TablePagination({
  page,
  totalPages,
  total,
  limit,
  limitOptions = [10, 15, 20, 50],
  unit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  limitOptions?: number[];
  /** Đơn vị hiển thị sau tổng, ví dụ "phiếu". */
  unit: string;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const visible = Math.min(5, totalPages);
  const navClass =
    "rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex shrink-0 items-center justify-between border-t bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Hiển thị</span>
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="rounded border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand">
          {limitOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">/ trang</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Trang đầu"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className={navClass}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Trang trước"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={navClass}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: visible }, (_, index) => {
          // Cửa sổ 5 trang quanh trang hiện tại, không vượt hai đầu.
          const value = Math.min(
            Math.max(page - 2 + index, index + 1),
            totalPages - (visible - 1 - index),
          );
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                value === page
                  ? "border-brand bg-brand text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {value}
            </button>
          );
        })}
        <button
          type="button"
          title="Trang sau"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={navClass}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Trang cuối"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className={navClass}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      <span className="text-xs text-gray-400">
        Trang {page}/{totalPages}
        {total > 0 ? ` • ${total.toLocaleString("vi-VN")} ${unit}` : ""}
      </span>
    </div>
  );
}
