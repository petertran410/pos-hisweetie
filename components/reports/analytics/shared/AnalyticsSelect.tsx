"use client";

import { useMemo } from "react";
import { FilterSearchableSelect } from "@/components/ui/filters";

/** Nhận cả dạng { value, label } (FilterOption) lẫn { key, label } (DashSelect cũ). */
export type AnalyticsSelectOption = {
  label: string;
  value?: string | number;
  key?: string | number;
};

/**
 * Dropdown chọn 1 dùng cho mọi chỗ trong báo cáo Phân tích (thay <select> của
 * trình duyệt và DashSelect): giao diện FilterSearchableSelect, luôn có ô tìm kiếm.
 *  - clearLabel: thêm dòng đầu (vd. "Tất cả nhân viên") trả về giá trị "".
 *    Không truyền → bắt buộc chọn 1 giá trị (bấm lại không bỏ chọn).
 *  - className: chiều rộng của ô (mặc định w-40).
 */
export function AnalyticsSelect({
  options,
  value,
  onChange,
  clearLabel,
  placeholder = "— Chọn —",
  className = "w-40",
  size = "filter",
}: {
  options: AnalyticsSelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  clearLabel?: string;
  placeholder?: string;
  className?: string;
  size?: "filter" | "form";
}) {
  const opts = useMemo(
    () =>
      options.map((o) => ({
        value: String(o.value ?? o.key ?? ""),
        label: o.label,
      })),
    [options],
  );
  const clearable = clearLabel !== undefined;
  return (
    <div className={className}>
      <FilterSearchableSelect
        options={opts}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(v) => {
          if (clearable || v !== "") onChange(v);
        }}
        placeholder={clearable ? clearLabel : placeholder}
        showClearOption={clearable}
        allowDeselect={clearable}
        size={size}
        searchable
      />
    </div>
  );
}
