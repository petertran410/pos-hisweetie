"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Info } from "lucide-react";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import {
  PRIORITY_STYLE,
  type RecommendationFilters,
  type RecommendationListItem,
} from "@/lib/types/purchasing-planning";
import { COLUMN_SORT_KEY, TOTAL_COLUMNS, computeTotal } from "./columns";

interface Props {
  items: RecommendationListItem[];
  visibleColumns: ColumnConfig<RecommendationListItem>[];
  filters: RecommendationFilters;
  onFiltersChange: (f: Partial<RecommendationFilters>) => void;
  selectedItemId: number | null;
  onSelectItem: (itemId: number) => void;
  isLoading?: boolean;
}

/** Số cột cố định bên trái khi cuộn ngang (mã hàng + tên hàng) */
const STICKY_COUNT = 2;

export function RecommendationSummaryTable({
  items,
  visibleColumns,
  filters,
  onFiltersChange,
  selectedItemId,
  onSelectItem,
  isLoading,
}: Props) {
  const handleSort = (colKey: string) => {
    const sortKey = COLUMN_SORT_KEY[colKey];
    if (!sortKey) return;

    if (filters.sortBy !== sortKey) {
      onFiltersChange({ sortBy: sortKey, sortDir: "asc", page: 1 });
    } else if (filters.sortDir === "asc") {
      onFiltersChange({ sortDir: "desc", page: 1 });
    } else {
      // Bấm lần 3 → trở về sắp xếp mặc định
      onFiltersChange({ sortBy: "priority", sortDir: "asc", page: 1 });
    }
  };

  // Tính vị trí `left` cho các cột cố định, cộng dồn theo chiều rộng
  const stickyOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < STICKY_COUNT; i++) {
    stickyOffsets.push(offset);
    offset += parseInt(visibleColumns[i]?.width ?? "120", 10);
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mb-2 h-8 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="font-medium text-gray-700">Không có sản phẩm nào</p>
        <p className="text-sm text-gray-500">
          Thử bỏ bớt bộ lọc hoặc tắt &quot;Chỉ hiện SKU cần đặt&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <table
        className="w-full border-collapse text-xs"
        style={{ minWidth: "max-content" }}>
        {/* ── HEADER ── */}
        <thead className="sticky top-0 z-20">
          <tr>
            {visibleColumns.map((col, idx) => {
              const sortKey = COLUMN_SORT_KEY[col.key];
              const sortable = !!sortKey;
              const active = sortable && filters.sortBy === sortKey;
              const isSticky = idx < STICKY_COUNT;

              return (
                <th
                  key={col.key}
                  onClick={() => sortable && handleSort(col.key)}
                  className={`group border-b border-gray-200 bg-gray-50 px-2 py-2 text-left font-semibold whitespace-nowrap text-gray-700 ${
                    sortable
                      ? "cursor-pointer select-none hover:bg-gray-100"
                      : ""
                  } ${isSticky ? "sticky z-10" : ""}`}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    ...(isSticky ? { left: `${stickyOffsets[idx]}px` } : {}),
                  }}>
                  <span className="relative flex items-center gap-1">
                    {col.label}
                    {col.tooltip && (
                      <>
                        <Info className="h-3 w-3 shrink-0 text-gray-300" />
                        <span
                          role="tooltip"
                          className={`pointer-events-none absolute top-full z-50 mt-2 w-56 rounded-md bg-gray-900 px-2.5 py-1.5 text-left text-xs leading-4 font-normal whitespace-normal text-white opacity-0 shadow-lg transition-opacity duration-150 delay-0 group-hover:opacity-100 group-hover:delay-[250ms] ${
                            idx === 0
                              ? "left-0"
                              : idx === visibleColumns.length - 1
                                ? "right-0"
                                : "left-1/2 -translate-x-1/2"
                          }`}>
                          {col.tooltip}
                        </span>
                      </>
                    )}
                    {sortable &&
                      (active ? (
                        filters.sortDir === "desc" ? (
                          <ArrowDown className="h-3 w-3 text-blue-600" />
                        ) : (
                          <ArrowUp className="h-3 w-3 text-blue-600" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                      ))}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* ── DÒNG TỔNG ── */}
          <tr className="font-medium">
            {visibleColumns.map((col, idx) => {
              const isSticky = idx < STICKY_COUNT;
              return (
                <td
                  key={col.key}
                  className={`border-b border-gray-200 bg-blue-50 px-2 py-1.5 whitespace-nowrap ${
                    isSticky ? "sticky z-10" : ""
                  }`}
                  style={
                    isSticky ? { left: `${stickyOffsets[idx]}px` } : undefined
                  }>
                  {idx === 0 ? (
                    <span className="text-gray-700">TỔNG ({items.length})</span>
                  ) : TOTAL_COLUMNS.has(col.key) ? (
                    computeTotal(col.key, items)
                  ) : null}
                </td>
              );
            })}
          </tr>

          {/* ── DỮ LIỆU ── */}
          {items.map((item) => {
            const style = PRIORITY_STYLE[item.priority];
            const selected = selectedItemId === item.itemId;
            // Cột sticky phải có nền đục, nếu không chữ bên dưới sẽ lộ ra khi cuộn
            const stickyBg = selected
              ? "bg-blue-50"
              : item.priority === "CRITICAL"
                ? "bg-red-50"
                : item.priority === "HIGH"
                  ? "bg-orange-50"
                  : "bg-white";

            return (
              <tr
                key={item.itemId}
                onClick={() => onSelectItem(item.itemId)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selected ? "bg-blue-50" : (style.row ?? "")
                }`}>
                {visibleColumns.map((col, idx) => {
                  const isSticky = idx < STICKY_COUNT;
                  return (
                    <td
                      key={col.key}
                      className={`border-b border-gray-100 px-2 py-1.5 ${
                        isSticky ? `sticky z-10 ${stickyBg}` : ""
                      }`}
                      style={
                        isSticky
                          ? { left: `${stickyOffsets[idx]}px` }
                          : undefined
                      }>
                      {col.render(item)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
