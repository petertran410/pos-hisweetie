"use client";

import { useMemo, useState } from "react";
import {
  formatNumber,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";

/**
 * Ô nhập số tiền cho phép gõ số thập phân mượt (giữ nguyên dấu "." và số 0 ở
 * cuối trong lúc gõ). Khi blur sẽ format lại theo locale.
 * - `maxFractionDigits`: số chữ số thập phân tối đa được phép gõ.
 * - `onValueChange`: trả về number đã parse.
 * - `formatWhileTyping` (mặc định bật): thêm dấu phẩy phân cách hàng nghìn
 *   ngay khi gõ (formatNumberInput). Truyền `formatWhileTyping={false}` để tắt.
 *
 * Giữ raw string trong lúc focus để không bị mất dấu "." khi đang gõ "1." —
 * đây là lý do input controlled thuần (value=formatNumber) không gõ được
 * "1.5": onChange "1." → parse ra 1 → re-render "1" → xóa mất dấu chấm.
 * Trích xuất từ PurchaseOrderForm để dùng chung cho OrderSupplierForm.
 * - `masked`: không hiện giá trị (kể cả khi focus) — ô trống + `placeholder`,
 *   vẫn gõ được giá mới. Dùng cho giá user không có quyền xem.
 * - `onClear`: khi có, xóa trắng ô gọi `onClear()` thay vì `onValueChange(0)`
 *   (phân biệt "chưa nhập" với "nhập 0"); truyền `value={NaN}` để hiện ô trống.
 */
export function NumericInput({
  value,
  onValueChange,
  maxFractionDigits = 3,
  formatWhileTyping = true,
  disabled,
  className,
  masked = false,
  placeholder,
  onClear,
}: {
  value: number;
  onValueChange: (next: number) => void;
  maxFractionDigits?: number;
  formatWhileTyping?: boolean;
  disabled?: boolean;
  className?: string;
  masked?: boolean;
  placeholder?: string;
  onClear?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  // Khi không focus, hiển thị giá trị đã format từ prop (nguồn sự thật), dùng
  // formatNumber của lib/utils (dấu phẩy ngăn cách hàng nghìn).
  const display = focused
    ? raw
    : masked
      ? ""
      : Number.isFinite(value)
        ? formatNumber(value, "en-US", { max: maxFractionDigits })
        : onClear
          ? "" // có onClear = phân biệt "chưa nhập" → NaN hiện ô trống
          : "0";

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
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        const nextRaw = !masked && Number.isFinite(value) && value ? String(value) : "";
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
        if (cleaned === "" && onClear) {
          setRaw("");
          onClear();
          return;
        }
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
