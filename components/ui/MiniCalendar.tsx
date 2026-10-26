"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
export const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
export const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ─── MiniCalendar ─────────────────────────────────────────────────────────────
export function MiniCalendar({
  value,
  onChange,
  onClose,
  minDate,
  maxDate,
  withTime = false,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
  minDate?: string;
  maxDate?: string;
  withTime?: boolean;
}) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const todayObj = new Date();
  const init = value
    ? new Date(value.includes("T") ? value : value + "T00:00:00")
    : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());
  const [hh, setHh] = useState<string>(pad2(init.getHours()));
  const [mm, setMm] = useState<string>(pad2(init.getMinutes()));

  // Phần ngày đang chọn (YYYY-MM-DD) tách từ value
  const selDatePart = value ? value.slice(0, 10) : "";

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  // Mon = 0 offset
  const startOffset = (new Date(vy, vm, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: number) =>
    `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Phát giá trị ra ngoài: kèm giờ nếu withTime
  const emit = (dateStr: string) => {
    if (!dateStr) {
      onChange("");
      return;
    }
    onChange(withTime ? `${dateStr}T${hh}:${mm}` : dateStr);
  };

  const handleTimeChange = (nextHh: string, nextMm: string) => {
    setHh(nextHh);
    setMm(nextMm);
    const base = selDatePart || fmt(todayObj.getDate());
    onChange(`${base}T${nextHh}:${nextMm}`);
  };

  const clampHour = (v: string) => pad2(Math.max(0, Math.min(23, parseInt(v || "0", 10) || 0)));
  const clampMinute = (v: string) => pad2(Math.max(0, Math.min(59, parseInt(v || "0", 10) || 0)));

  const prev = () =>
    vm === 0 ? (setVm(11), setVy((y) => y - 1)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVm(0), setVy((y) => y + 1)) : setVm((m) => m + 1);

  return (
    // Màu dùng class Tailwind (biến toàn cục) như lịch ở sidebar Hóa đơn: lịch
    // mở qua portal ra ngoài .dt-dash vẫn hiện đúng ngày đang chọn.
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const ds = fmt(day);
          const isSel = selDatePart === ds;
          const isToday =
            todayObj.getFullYear() === vy &&
            todayObj.getMonth() === vm &&
            todayObj.getDate() === day;
           const isDisabled =
             (!!minDate && ds < minDate) || (!!maxDate && ds > maxDate);

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                emit(ds);
                if (!withTime) onClose();
              }}
              className={[
                "aspect-square text-xs rounded-lg flex items-center justify-center transition-colors",
                isSel
                  ? "bg-brand text-white font-bold"
                  : isToday
                    ? "border border-brand text-brand font-semibold hover:bg-brand-soft"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-brand-soft cursor-pointer",
              ].join(" ")}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Time picker */}
      {withTime && (
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Giờ:
          </span>
          <input
            type="number"
            min={0}
            max={23}
            value={hh}
            onChange={(e) => setHh(e.target.value)}
            onBlur={(e) => handleTimeChange(clampHour(e.target.value), mm)}
            className="w-14 text-center border rounded px-2 py-1 text-sm focus:outline-none"
          />
          <span className="text-gray-400 font-semibold">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={mm}
            onChange={(e) => setMm(e.target.value)}
            onBlur={(e) => handleTimeChange(hh, clampMinute(e.target.value))}
            className="w-14 text-center border rounded px-2 py-1 text-sm focus:outline-none"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
          Xóa
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const ds = `${now.getFullYear()}-${pad2(
                now.getMonth() + 1
              )}-${pad2(now.getDate())}`;
              if (withTime) {
                const nh = pad2(now.getHours());
                const nm = pad2(now.getMinutes());
                setHh(nh);
                setMm(nm);
                onChange(`${ds}T${nh}:${nm}`);
              } else {
                onChange(ds);
                onClose();
              }
            }}
            className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft">
            {withTime ? "Bây giờ" : "Hôm nay"}
          </button>
          {withTime && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-3 py-1 rounded transition-colors text-white bg-brand hover:bg-brand-dark">
              Xong
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
