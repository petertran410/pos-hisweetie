"use client";

import {
  formatPriceWarningText,
  type PriceWarning,
} from "@/lib/utils/price-warning";

interface PriceMismatchNoteProps {
  warning: PriceWarning | null | undefined;
  className?: string;
}

/**
 * Cảnh báo inline khi đơn giá hiện tại khác với giá bán gần nhất của
 * cặp khách hàng + sản phẩm. Render null khi không có cảnh báo.
 */
export function PriceMismatchNote({
  warning,
  className,
}: PriceMismatchNoteProps) {
  if (!warning) return null;

  const colorClass =
    warning.direction === "lower" ? "text-red-600" : "text-amber-600";

  return (
    <div
      className={`text-xs font-medium ${colorClass} ${className ?? ""}`}
      role="alert">
      ⚠️ {formatPriceWarningText(warning)}
    </div>
  );
}
