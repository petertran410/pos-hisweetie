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
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const todayObj = new Date();
  const init = value ? new Date(value + "T00:00:00") : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

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

  const prev = () =>
    vm === 0 ? (setVm(11), setVy((y) => y - 1)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVm(0), setVy((y) => y + 1)) : setVm((m) => m + 1);

  return (
    <div
      className="mt-2 bg-white border rounded-xl p-3 shadow-sm select-none"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="dt-icon-btn p-1 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--dt-text)" }}>
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="dt-icon-btn p-1 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium py-0.5"
            style={{ color: "var(--dt-text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const ds = fmt(day);
          const isSel = value === ds;
          const isToday =
            todayObj.getFullYear() === vy &&
            todayObj.getMonth() === vm &&
            todayObj.getDate() === day;
          const isDisabled = !!minDate && ds < minDate;

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className="dt-cal-cell aspect-square text-xs rounded-lg flex items-center justify-center transition-colors"
              data-plain={!isSel && !isToday && !isDisabled}
              style={
                isSel
                  ? { background: "var(--dt-primary)", color: "#fff", fontWeight: 700 }
                  : isToday
                    ? {
                        border: "1px solid var(--dt-primary)",
                        color: "var(--dt-primary)",
                        fontWeight: 600,
                      }
                    : isDisabled
                      ? { color: "var(--dt-border)", cursor: "not-allowed" }
                      : { color: "var(--dt-text-secondary)", cursor: "pointer" }
              }>
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex justify-between mt-2 pt-2 border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="dt-icon-btn text-xs px-2 py-1 rounded transition-colors"
          style={{ color: "var(--dt-text-muted)" }}>
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs font-medium px-2 py-1 rounded transition-colors"
          style={{ color: "var(--dt-primary)" }}>
          Hôm nay
        </button>
      </div>
    </div>
  );
}
