"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Info, PackageSearch } from "lucide-react";
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
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="border-brand h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 py-20 text-center text-gray-400">
        <PackageSearch className="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm">Không có sản phẩm nào</p>
        <p className="mt-1 text-xs">
          Thử bỏ bớt bộ lọc hoặc tắt &quot;Chỉ hiện SKU cần đặt&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <table
        className="w-full border-collapse text-sm"
        style={{ minWidth: "max-content" }}>
        {/* ── HEADER ── */}
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr>
            {visibleColumns.map((col, idx) => {
              const sortKey = COLUMN_SORT_KEY[col.key];
              const sortable = !!sortKey;
              const active = sortable && filters.sortBy === sortKey;
const isSticky = idx < STICKY_COUNT;
          const isLastSticky = idx === STICKY_COUNT - 1;

          return (
            <th
              key={col.key}
              onClick={() => sortable && handleSort(col.key)}
              className={`group border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-gray-600 uppercase ${
                sortable
                  ? "cursor-pointer select-none hover:bg-gray-100"
                  : ""
              } ${isSticky ? "sticky z-30" : ""} ${isLastSticky ? "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]" : ""}`}
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
                          <ArrowDown className="text-brand h-3 w-3" />
                        ) : (
                          <ArrowUp className="text-brand h-3 w-3" />
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
              const isLastSticky = idx === STICKY_COUNT - 1;
              return (
                <td
                  key={col.key}
                  className={`bg-brand-soft border-b border-gray-200 px-4 py-2.5 whitespace-nowrap ${
                    isSticky ? "sticky z-10" : ""
                  } ${isLastSticky ? "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]" : ""}`}
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
            const stickyBg = selected
              ? "bg-brand-soft group-hover:bg-brand-soft"
              : item.priority === "CRITICAL"
                ? "bg-red-50 group-hover:bg-red-100"
                : item.priority === "HIGH"
                  ? "bg-orange-50 group-hover:bg-orange-100"
                  : "bg-white group-hover:bg-gray-50";

            return (
              <tr
                key={item.itemId}
                onClick={() => onSelectItem(item.itemId)}
                className={`group cursor-pointer transition-colors hover:bg-gray-50 ${
                  selected ? "bg-brand-soft" : (style.row ?? "")
                }`}>
                {visibleColumns.map((col, idx) => {
                  const isSticky = idx < STICKY_COUNT;
                  const isLastSticky = idx === STICKY_COUNT - 1;
                  return (
                    <td
                      key={col.key}
                      className={`border-b border-gray-100 px-4 py-2.5 ${
                        isSticky ? `sticky z-10 ${stickyBg}` : ""
                      } ${isLastSticky ? "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]" : ""}`}
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
