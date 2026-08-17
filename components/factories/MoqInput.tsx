"use client";

import {
  MOQ_SCOPES,
  MOQ_SCOPE_LABEL,
  MOQ_UNITS_BY_BASIS,
  MOQ_UNIT_LABEL,
  MoqBasis,
  MoqScope,
  MoqUnit,
  basisOfUnit,
} from "@/lib/utils/moq";

/**
 * Giá trị MOQ trên form. Tách rời khỏi `MoqSpec` vì lúc đang nhập,
 * người dùng có thể để trống số mà vẫn giữ đơn vị đã chọn.
 */
export interface MoqInputValue {
  value?: number;
  unit?: MoqUnit;
  scope?: MoqScope;
  increment?: number;
}

interface MoqInputProps {
  value: MoqInputValue;
  onChange: (next: MoqInputValue) => void;
  /** Bỏ phần chọn phạm vi (mapping SP × nhà máy luôn là PER_LINE). */
  showScope?: boolean;
  disabled?: boolean;
  className?: string;
}

const INPUT_CLASS =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand transition-all disabled:bg-gray-50 disabled:text-gray-400";

/** Mọi đơn vị hợp lệ, gom theo basis để render optgroup. */
const UNIT_GROUPS: Array<{ basis: MoqBasis; label: string }> = [
  { basis: "QUANTITY", label: "Số lượng" },
  { basis: "WEIGHT", label: "Khối lượng" },
];

const toNumberOrUndefined = (raw: string) =>
  raw.trim() === "" ? undefined : Number(raw);

/**
 * Nhập MOQ theo 3 chiều: số lượng + đơn vị + phạm vi (kèm bội số tuỳ chọn).
 *
 * Ví dụ diễn đạt được: "100 thùng", "2 tấn", "5 tấn / lần đặt hàng".
 */
export function MoqInput({
  value,
  onChange,
  showScope = true,
  disabled = false,
  className = "",
}: MoqInputProps) {
  const unit = value.unit ?? "CARTON";
  const scope = value.scope ?? (showScope ? "PER_ORDER" : "PER_LINE");
  const hasValue = value.value != null;

  return (
    <div className={className}>
      <div className={`grid gap-2 ${showScope ? "grid-cols-3" : "grid-cols-2"}`}>
        <input
          type="number"
          min={0}
          step="any"
          disabled={disabled}
          value={value.value ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              value: toNumberOrUndefined(event.target.value),
              // Chọn số trước khi chọn đơn vị là thao tác phổ biến — gán
              // đơn vị mặc định để dữ liệu lưu xuống không bị khuyết.
              unit: value.unit ?? "CARTON",
              scope: value.scope ?? scope,
            })
          }
          placeholder="Số lượng tối thiểu"
          className={INPUT_CLASS}
        />

        <select
          disabled={disabled || !hasValue}
          value={unit}
          onChange={(event) =>
            onChange({ ...value, unit: event.target.value as MoqUnit })
          }
          className={`${INPUT_CLASS} cursor-pointer disabled:cursor-default`}>
          {UNIT_GROUPS.map((group) => (
            <optgroup key={group.basis} label={group.label}>
              {MOQ_UNITS_BY_BASIS[group.basis].map((option) => (
                <option key={option} value={option}>
                  {MOQ_UNIT_LABEL[option]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {showScope && (
          <select
            disabled={disabled || !hasValue}
            value={scope}
            onChange={(event) =>
              onChange({ ...value, scope: event.target.value as MoqScope })
            }
            className={`${INPUT_CLASS} cursor-pointer disabled:cursor-default`}>
            {MOQ_SCOPES.map((option) => (
              <option key={option} value={option}>
                {MOQ_SCOPE_LABEL[option]}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-2">
        <input
          type="number"
          min={0}
          step="any"
          disabled={disabled || !hasValue}
          value={value.increment ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              increment: toNumberOrUndefined(event.target.value),
            })
          }
          placeholder={`Bội số sau khi đạt MOQ (tuỳ chọn) — ${MOQ_UNIT_LABEL[unit]}`}
          className={INPUT_CLASS}
        />
      </div>

      <p className="text-xs text-gray-400 mt-1">
        {hasValue ? (
          <>
            Yêu cầu tối thiểu{" "}
            <span className="font-medium text-gray-600">
              {value.value?.toLocaleString("vi-VN")} {MOQ_UNIT_LABEL[unit]}
            </span>
            {showScope && ` · ${MOQ_SCOPE_LABEL[scope]}`}
            {basisOfUnit(unit) === "WEIGHT" &&
              " — tính theo khối lượng tịnh của sản phẩm."}
          </>
        ) : (
          "Bỏ trống nếu nhà máy không đặt mức tối thiểu."
        )}
      </p>
    </div>
  );
}
