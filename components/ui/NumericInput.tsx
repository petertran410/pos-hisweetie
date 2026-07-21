"use client";

import { useMemo, useState } from "react";

// Định dạng số có ngăn cách hàng nghìn, tối đa `maxFractionDigits` số thập
// phân (mặc định 3). Không ép số thập phân tối thiểu nên 1000 vẫn hiển thị
// "1,000", còn 1001.67 hiển thị "1,001.67".
function formatNumber(value: number, maxFractionDigits = 3): string {
  if (!isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Ô nhập số tiền cho phép gõ số thập phân mượt (giữ nguyên dấu "." và số 0 ở
 * cuối trong lúc gõ). Khi blur sẽ format lại theo locale.
 * - `maxFractionDigits`: số chữ số thập phân tối đa được phép gõ.
 * - `onValueChange`: trả về number đã parse.
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
  disabled,
  className,
}: {
  value: number;
  onValueChange: (next: number) => void;
  maxFractionDigits?: number;
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
        // Bắt đầu gõ từ giá trị số thuần (bỏ dấu phẩy ngăn cách).
        setRaw(value ? String(value) : "");
        e.target.select();
      }}
      onChange={(e) => {
        // Bỏ dấu phẩy ngăn cách, chỉ nhận số + tối đa N chữ số thập phân.
        const cleaned = e.target.value.replace(/,/g, "");
        if (cleaned === "" || decimalPattern.test(cleaned)) {
          setRaw(cleaned);
          onValueChange(cleaned === "" ? 0 : parseFloat(cleaned) || 0);
        }
      }}
      onBlur={() => setFocused(false)}
    />
  );
}
