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
  withTime = false,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
  minDate?: string;
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
          const isSel = selDatePart === ds;
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
                emit(ds);
                if (!withTime) onClose();
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

      {/* Time picker */}
      {withTime && (
        <div
          className="flex items-center justify-center gap-2 mt-3 pt-3 border-t"
          style={{ borderColor: "var(--dt-border)" }}>
          <span className="text-xs" style={{ color: "var(--dt-text-muted)" }}>
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
            className="text-xs font-medium px-2 py-1 rounded transition-colors"
            style={{ color: "var(--dt-primary)" }}>
            {withTime ? "Bây giờ" : "Hôm nay"}
          </button>
          {withTime && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-3 py-1 rounded transition-colors text-white"
              style={{ background: "var(--dt-primary)" }}>
              Xong
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
