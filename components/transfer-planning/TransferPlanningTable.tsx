"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, PackageOpen, HelpCircle } from "lucide-react";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import type { TransferPlanningItem } from "@/lib/types/transfer-planning";
import type { TransferPlanningColumnCtx } from "./columns";
import { CustomTooltip } from "@/components/ui/CustomTooltip";

interface TransferPlanningTableProps {
  items: TransferPlanningItem[];
  visibleColumns: ColumnConfig<TransferPlanningItem, TransferPlanningColumnCtx>[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  isLoading?: boolean;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  onResetFilters?: () => void;
  columnContext?: TransferPlanningColumnCtx;
}

const RIGHT_ALIGNED_KEYS = [
  "stockHN",
  "stockSG",
  "inTransit",
  "committed",
  "confirmedOrders",
  "demandPerDay",
  "availableStockSG",
  "targetStockSG",
  "suggestedQuantity",
  "pendingTransfer",
];

const CENTER_ALIGNED_KEYS = ["unit", "alert"];

export function TransferPlanningTable({
  items,
  visibleColumns,
  selectedItemId,
  onSelectItem,
  isLoading = false,
  sortBy,
  sortDirection,
  onSort,
  onResetFilters,
  columnContext,
}: TransferPlanningTableProps) {
  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400 space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Đang tải dữ liệu kế hoạch chuyển kho...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
          <PackageOpen className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Không tìm thấy sản phẩm nào</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc ở thanh bên trái.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
            Đặt lại bộ lọc
          </button>
        )}
      </div>
    );
  }

  // Tính toán vị trí offset động cho các cột sticky để tránh đè chữ khi cuộn ngang
  const skuCol = visibleColumns.find((c) => c.key === "sku");
  const isSkuVisible = Boolean(skuCol);
  const skuWidth = skuCol ? parseInt(skuCol.width || "110", 10) || 110 : 0;

  return (
    <div className="flex-1 overflow-auto custom-sidebar-scroll relative">
      <table className="w-full text-left border-collapse text-sm">
        {/* Sticky Header */}
        <thead
          className="sticky top-0 z-30 bg-gray-100 shadow-sm text-xs font-semibold text-gray-700 border-b"
          style={{ borderColor: "var(--dt-border)" }}>
          <tr>
            {visibleColumns.map((col) => {
              const isPinnedSKU = col.key === "sku";
              const isPinnedName = col.key === "name";
              const isPinned = isPinnedSKU || isPinnedName;

              const isRight = RIGHT_ALIGNED_KEYS.includes(col.key);
              const isCenter = CENTER_ALIGNED_KEYS.includes(col.key);

              const isSortable = [
                "sku",
                "name",
                "stockHN",
                "stockSG",
                "inTransit",
                "committed",
                "confirmedOrders",
                "demandPerDay",
                "availableStockSG",
                "availableDays",
                "targetStockSG",
                "suggestedQuantity",
                "pendingTransfer",
                "alert",
              ].includes(col.key);

              const isCurrentSort = sortBy === col.key;

              // Tính left offset chính xác
              let pinnedLeft: string | undefined = undefined;
              if (isPinnedSKU) pinnedLeft = "0px";
              if (isPinnedName) pinnedLeft = isSkuVisible ? `${skuWidth}px` : "0px";

              const isLastPinned =
                (isPinnedName && isSkuVisible) || (isPinnedSKU && !visibleColumns.some((c) => c.key === "name"));

              return (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    left: pinnedLeft,
                  }}
                  className={`py-3 px-3.5 select-none whitespace-nowrap bg-gray-100 ${
                    isPinned ? "sticky z-30 bg-gray-100" : ""
                  } ${isLastPinned ? "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]" : ""}`}>
                  <div
                    className={`inline-flex items-center gap-1 ${
                      isSortable ? "cursor-pointer hover:text-gray-900" : ""
                    } ${
                      isRight
                        ? "justify-end w-full"
                        : isCenter
                        ? "justify-center w-full"
                        : "justify-start"
                    }`}
                    onClick={() => isSortable && onSort?.(col.key)}>
                    <span>{col.label}</span>

                    {/* Custom Tooltip với delay 200ms */}
                    {col.tooltip && (
                      <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center">
                        <CustomTooltip content={col.tooltip} delayMs={200}>
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                        </CustomTooltip>
                      </span>
                    )}

                    {isSortable && (
                      <span className="text-gray-400">
                        {isCurrentSort ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;
            const isNeedTransfer = item.computed.suggestedQuantity > 0;
            const isDarkRed = item.computed.alert === "DARK_RED";

            // Xác định màu nền cụ thể cho từng dòng để áp dụng cho sticky cells
            let cellBgClass = "bg-white group-hover:bg-gray-50/80";
            let rowBgClass = "hover:bg-gray-50/80";

            if (isSelected) {
              cellBgClass = "bg-sky-50 font-medium";
              rowBgClass = "bg-sky-50";
            } else if (isDarkRed) {
              cellBgClass = "bg-rose-50/60 group-hover:bg-rose-50/80";
              rowBgClass = "bg-rose-50/60 hover:bg-rose-50/80";
            } else if (isNeedTransfer) {
              cellBgClass = "bg-amber-50/20 group-hover:bg-amber-50/40";
              rowBgClass = "bg-amber-50/20 hover:bg-amber-50/40";
            }

            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group cursor-pointer transition-colors duration-150 ${rowBgClass}`}>
                {visibleColumns.map((col) => {
                  const isPinnedSKU = col.key === "sku";
                  const isPinnedName = col.key === "name";
                  const isPinned = isPinnedSKU || isPinnedName;

                  let pinnedLeft: string | undefined = undefined;
                  if (isPinnedSKU) pinnedLeft = "0px";
                  if (isPinnedName) pinnedLeft = isSkuVisible ? `${skuWidth}px` : "0px";

                  const isLastPinned =
                    (isPinnedName && isSkuVisible) || (isPinnedSKU && !visibleColumns.some((c) => c.key === "name"));

                  return (
                    <td
                      key={col.key}
                      style={{
                        left: pinnedLeft,
                      }}
                      className={`py-2.5 px-3.5 whitespace-nowrap ${
                        isPinned
                          ? `sticky z-10 ${cellBgClass} ${
                              isLastPinned ? "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]" : ""
                            }`
                          : ""
                      }`}>
                      {col.render ? col.render(item, columnContext) : (item as any)[col.key]}
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
