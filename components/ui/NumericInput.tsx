"use client";

import { useMemo, useState } from "react";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";

function formatNumber(value: number, maxFractionDigits: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Ô nhập số tiền cho phép gõ số thập phân mượt (giữ nguyên dấu "." và số 0 ở
 * cuối trong lúc gõ). Khi blur sẽ format lại theo locale.
 * - `maxFractionDigits`: số chữ số thập phân tối đa được phép gõ.
 * - `onValueChange`: trả về number đã parse.
 * - `formatWhileTyping`: thêm dấu phẩy phân cách hàng nghìn ngay khi gõ.
 *
 * Giữ raw string trong lúc focus để không bị mất dấu "." khi đang gõ "1." —
 * đây là lý do input controlled thuần (value=formatNumber) không gõ được
 * "1.5": onChange "1." → parse ra 1 → re-render "1" → xóa mất dấu chấm.
 * Trích xuất từ PurchaseOrderForm để dùng chung cho OrderSupplierForm.
 */
export function NumericInput({
  value,
  onValueChange,
  maxFractionDigits = 3,
  formatWhileTyping = false,
  disabled,
  className,
}: {
  value: number;
  onValueChange: (next: number) => void;
  maxFractionDigits?: number;
  formatWhileTyping?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  // Khi không focus, hiển thị giá trị đã format từ prop (nguồn sự thật).
  const display = focused ? raw : formatNumber(value, maxFractionDigits);

  const decimalPattern = useMemo(
    () =>
      maxFractionDigits > 0
        ? new RegExp(`^\\d*(?:\\.\\d{0,${maxFractionDigits}})?$`)
        : /^\d*$/,
    [maxFractionDigits]
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        const nextRaw = value ? String(value) : "";
        setRaw(
          formatWhileTyping
            ? formatNumberInput(nextRaw, maxFractionDigits)
            : nextRaw
        );
        e.target.select();
      }}
      onChange={(e) => {
        // Bỏ dấu phẩy ngăn cách, chỉ nhận số + tối đa N chữ số thập phân.
        const cleaned = e.target.value.replace(/,/g, "");
        if (cleaned === "" || decimalPattern.test(cleaned)) {
          setRaw(
            formatWhileTyping
              ? formatNumberInput(cleaned, maxFractionDigits)
              : cleaned
          );
          onValueChange(cleaned === "" ? 0 : parseNumberInput(cleaned));
        }
      }}
      onBlur={() => setFocused(false)}
    />
  );
}
