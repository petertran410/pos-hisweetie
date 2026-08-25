"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  PaginationMeta,
  RecommendationFilters,
} from "@/lib/types/purchasing-planning";

interface Props {
  pagination?: PaginationMeta;
  filters: RecommendationFilters;
  onFiltersChange: (f: Partial<RecommendationFilters>) => void;
}

const PAGE_SIZES = [10, 15, 20, 50, 100];

/** Số nút trang tối đa hiển thị cùng lúc. */
const MAX_PAGE_BUTTONS = 5;

/**
 * Thanh phân trang đặt ở đáy panel — dùng chung bố cục 3 cụm với mọi bảng
 * khác trong hệ thống: chọn số dòng / chuyển trang / tổng số bản ghi.
 *
 * Cố ý luôn hiển thị kể cả khi chỉ có một trang: ô "số dòng mỗi trang" và
 * tổng số bản ghi vẫn là thông tin người dùng cần, và việc thanh này biến mất
 * làm chiều cao bảng nhảy mỗi lần đổi bộ lọc.
 */
export function RecommendationPagination({
  pagination,
  filters,
  onFiltersChange,
}: Props) {
  const page = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const total = pagination?.total ?? 0;
  const limit = filters.limit ?? pagination?.limit ?? 20;

  const buttonCount = Math.min(MAX_PAGE_BUTTONS, totalPages);

  return (
    <div
      className="flex shrink-0 items-center justify-between border-t bg-white px-4 py-2.5"
      style={{ borderColor: "var(--dt-border)" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Hiển thị</span>
        <select
          value={limit}
          onChange={(e) =>
            onFiltersChange({ limit: Number(e.target.value), page: 1 })
          }
          className="focus:ring-brand rounded border bg-white px-2 py-1 text-xs focus:ring-1 focus:outline-none"
          style={{ borderColor: "var(--dt-border)" }}>
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">/ trang</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onFiltersChange({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
          className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--dt-border)" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: buttonCount }, (_, index) => {
          // Giữ trang hiện tại ở giữa dải nút, nhưng không tràn khỏi [1, totalPages].
          const target = Math.min(
            Math.max(page - 2 + index, index + 1),
            totalPages - (buttonCount - 1 - index)
          );
          return (
            <button
              key={target}
              type="button"
              onClick={() => onFiltersChange({ page: target })}
              className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                target === page
                  ? "bg-brand border-brand text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {target}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            onFiltersChange({ page: Math.min(totalPages, page + 1) })
          }
          disabled={page >= totalPages}
          className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--dt-border)" }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <span className="text-xs text-gray-400">
        Trang {page}/{totalPages}
        {total > 0 ? ` · ${total.toLocaleString("vi-VN")} sản phẩm` : ""}
      </span>
    </div>
  );
}
