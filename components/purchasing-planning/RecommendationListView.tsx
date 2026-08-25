"use client";

import { AlertTriangle, PackageSearch } from "lucide-react";
import { PriorityBadge, ReliabilityBadge } from "./PriorityBadge";
import { money, num } from "./columns";
import {
  PRIORITY_STYLE,
  type RecommendationListItem,
} from "@/lib/types/purchasing-planning";

interface Props {
  items: RecommendationListItem[];
  isLoading: boolean;
  selectedItemId: number | null;
  onSelectItem: (itemId: number) => void;
}

/**
 * Chế độ xem DANH SÁCH — mỗi SKU một khối, ưu tiên đọc hiểu.
 * Bố cục theo PRD §12.4.
 */
export function RecommendationListView({
  items,
  isLoading,
  selectedItemId,
  onSelectItem,
}: Props) {
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
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y" style={{ borderColor: "var(--dt-border)" }}>
        {items.map((item) => (
          <RecommendationRow
            key={item.itemId}
            item={item}
            selected={selectedItemId === item.itemId}
            onSelect={() => onSelectItem(item.itemId)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MỘT DÒNG SẢN PHẨM
// ═══════════════════════════════════════════════════════════════════════════

function RecommendationRow({
  item,
  selected,
  onSelect,
}: {
  item: RecommendationListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = PRIORITY_STYLE[item.priority];
  const blocked = item.flags.some((f) => f.blocksRecommendation);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-4 py-3 text-left transition-colors ${
        selected ? "bg-brand-soft" : style.row ? style.row : "hover:bg-gray-50"
      }`}>
      {/* Hàng 1: mã, tên, NCC */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PriorityBadge priority={item.priority} size="sm" />
          <span className="font-medium whitespace-nowrap">
            {item.productCode}
          </span>
          <span className="truncate text-sm text-gray-700">
            {item.productName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
          <span>{item.supplierName ?? "Chưa có NCC"}</span>
          <span>·</span>
          <span>LT {item.leadTimeDays}n</span>
        </div>
      </div>

      {/* Hàng 2: kết luận bằng lời (backend sinh) */}
      <div
        className={`mb-1.5 text-sm ${
          item.priority === "CRITICAL"
            ? "font-medium text-red-700"
            : item.priority === "HIGH"
              ? "font-medium text-orange-700"
              : "text-gray-600"
        }`}>
        {item.summaryText}
      </div>

      {/* Hàng 3: số liệu thô */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          Tồn{" "}
          <span className="font-medium text-gray-700">
            {num(item.physicalStock)}
          </span>
          {item.reservedStock > 0 && (
            <span className="text-gray-400">
              {" "}
              (đã hứa {num(item.reservedStock)})
            </span>
          )}
        </span>
        {item.incomingTotal > 0 && (
          <span>
            Đang về{" "}
            <span className="font-medium text-gray-700">
              {num(item.incomingTotal)}
            </span>
          </span>
        )}
        <span>
          Bán{" "}
          <span className="font-medium text-gray-700">
            {num(item.forecastDailyDemand, 1)}
          </span>
          /ngày
        </span>
        {item.daysOfSupply !== null && (
          <span>
            Còn{" "}
            <span className="font-medium text-gray-700">
              {num(item.daysOfSupply, 0)}
            </span>{" "}
            ngày
          </span>
        )}
      </div>

      {/* Hàng 4: đề xuất + cảnh báo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {blocked ? (
            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              Bị chặn — cần xử lý dữ liệu
            </span>
          ) : item.suggestedQuantity > 0 ? (
            <span className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
              ĐỀ XUẤT: {num(item.suggestedQuantity)} {item.unit ?? ""}
              {item.suggestedPackCount ? (
                <span className="font-normal opacity-80">
                  {" "}
                  ({num(item.suggestedPackCount, 1)} thùng)
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Chưa cần đặt</span>
          )}

          {item.estimatedValue ? (
            <span className="text-xs text-gray-500">
              ≈ {money(item.estimatedValue)}
            </span>
          ) : null}

          <ReliabilityBadge reliability={item.reliability} />
        </div>

        {item.flags.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {item.flags.length} cảnh báo
          </span>
        )}
      </div>
    </button>
  );
}
