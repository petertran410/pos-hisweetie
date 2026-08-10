"use client";

import { useEffect, useState } from "react";

interface Props {
  from?: number;
  to?: number;
  onChange: (from: number | undefined, to: number | undefined) => void;
  placeholderFrom?: string;
  placeholderTo?: string;
  /** Đơn vị hiển thị bên phải ô nhập (vd: "ngày", "đ") */
  suffix?: string;
  min?: number;
  step?: number;
  /** Thời gian chờ trước khi báo thay đổi ra ngoài (ms) */
  debounceMs?: number;
}

/**
 * Bộ lọc khoảng số (min–max) dùng chung.
 * Tự debounce để không gọi API mỗi lần gõ phím.
 */
export function FilterNumberRange({
  from,
  to,
  onChange,
  placeholderFrom = "Từ",
  placeholderTo = "Đến",
  suffix,
  min,
  step,
  debounceMs = 400,
}: Props) {
  const [localFrom, setLocalFrom] = useState<string>(from?.toString() ?? "");
  const [localTo, setLocalTo] = useState<string>(to?.toString() ?? "");

  // Đồng bộ khi giá trị bên ngoài thay đổi (vd: bấm "Đặt lại")
  useEffect(() => {
    setLocalFrom(from?.toString() ?? "");
  }, [from]);

  useEffect(() => {
    setLocalTo(to?.toString() ?? "");
  }, [to]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsedFrom = localFrom.trim() === "" ? undefined : Number(localFrom);
      const parsedTo = localTo.trim() === "" ? undefined : Number(localTo);

      const nextFrom = Number.isNaN(parsedFrom) ? undefined : parsedFrom;
      const nextTo = Number.isNaN(parsedTo) ? undefined : parsedTo;

      if (nextFrom !== from || nextTo !== to) {
        onChange(nextFrom, nextTo);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFrom, localTo]);

  const inputClass =
    "w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={localFrom}
        min={min}
        step={step}
        onChange={(e) => setLocalFrom(e.target.value)}
        placeholder={placeholderFrom}
        className={inputClass}
        style={{ borderColor: "var(--dt-border)" }}
      />
      <span className="shrink-0 text-xs text-gray-400">–</span>
      <input
        type="number"
        inputMode="numeric"
        value={localTo}
        min={min}
        step={step}
        onChange={(e) => setLocalTo(e.target.value)}
        placeholder={placeholderTo}
        className={inputClass}
        style={{ borderColor: "var(--dt-border)" }}
      />
      {suffix && (
        <span className="shrink-0 text-xs whitespace-nowrap text-gray-500">
          {suffix}
        </span>
      )}
    </div>
  );
}
