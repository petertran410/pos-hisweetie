"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Calendar } from "lucide-react";

interface Props {
  /** Giá trị dạng YYYY-MM-DD (rỗng = chưa chọn). */
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Không cho chọn trước ngày này (YYYY-MM-DD). */
  minDate?: string;
  className?: string;
}

// Lịch nhỏ — tái dùng phong cách MiniCalendar ở sidebar bộ lọc.
function CalendarBody({
  value,
  onChange,
  onClose,
  minDate,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const todayObj = new Date();
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(value).getMonth() : todayObj.getMonth()
  );
  const [viewYear, setViewYear] = useState(
    value ? new Date(value).getFullYear() : todayObj.getFullYear()
  );

  // Chế độ hiển thị: chọn ngày | chọn tháng | chọn năm.
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  // Thập kỷ đang xem ở lưới năm (12 năm: yearBase-1 .. yearBase+10).
  const [yearBase, setYearBase] = useState(viewYear - (viewYear % 10));

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Bắt đầu tuần từ Thứ 2 (giống ảnh: M T W T F S S)
  const rawDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=CN
  const firstDow = (rawDow + 6) % 7; // 0=Thứ2
  const todayStr = todayObj.toISOString().split("T")[0];

  const prev = () => {
    if (mode === "days") {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else setViewMonth((m) => m - 1);
    } else if (mode === "months") {
      setViewYear((y) => y - 1);
    } else {
      setYearBase((b) => b - 10);
    }
  };
  const next = () => {
    if (mode === "days") {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else setViewMonth((m) => m + 1);
    } else if (mode === "months") {
      setViewYear((y) => y + 1);
    } else {
      setYearBase((b) => b + 10);
    }
  };

  const headerLabel =
    mode === "days"
      ? `Tháng ${viewMonth + 1}/${viewYear}`
      : mode === "months"
        ? `Năm ${viewYear}`
        : `${yearBase} - ${yearBase + 11}`;

  const openHeader = () => {
    if (mode === "days") setMode("months");
    else if (mode === "months") {
      setYearBase(viewYear - (viewYear % 10));
      setMode("years");
    } else setMode("days");
  };

  return (
    <div
      className="bg-white border rounded-lg shadow-lg p-3 w-64"
      onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={openHeader}
          className="text-sm font-semibold px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
          {headerLabel}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            className="p-1 hover:bg-gray-100 rounded">
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={next}
            className="p-1 hover:bg-gray-100 rounded">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      </div>

      {/* ── Chọn NGÀY ── */}
      {mode === "days" && (
        <>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 mb-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {Array.from({ length: firstDow }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSel = ds === value;
              const isToday = ds === todayStr;
              const isDisabled = !!minDate && ds < minDate;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    onChange(ds);
                    onClose();
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
        </>
      )}

      {/* ── Chọn THÁNG ── */}
      {mode === "months" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, m) => {
            const isSel = m === viewMonth;
            return (
              <button
                key={m}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setViewMonth(m);
                  setMode("days");
                }}
                className={[
                  "py-2 text-xs rounded-lg transition-colors",
                  isSel
                    ? "bg-brand text-white font-semibold"
                    : "text-gray-700 hover:bg-brand-soft",
                ].join(" ")}>
                Th {m + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chọn NĂM ── */}
      {mode === "years" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => {
            const year = yearBase + i;
            const isSel = year === viewYear;
            return (
              <button
                key={year}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setViewYear(year);
                  setMode("months");
                }}
                className={[
                  "py-2 text-xs rounded-lg transition-colors",
                  isSel
                    ? "bg-brand text-white font-semibold"
                    : "text-gray-700 hover:bg-brand-soft",
                ].join(" ")}>
                {year}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
          Xóa
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            onChange(todayStr);
            onClose();
          }}
          className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  minDate,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Ưu tiên hiện phía dưới; nếu sát đáy màn hình thì hiện phía trên.
      const openUp = r.bottom + 340 > window.innerHeight;
      setPos({
        top: openUp ? r.top - 340 : r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - 270),
      });
    }
    setOpen(true);
  };

  const display = value
    ? new Date(value).toLocaleDateString("vi-VN")
    : placeholder;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={
          className ??
          `w-full flex items-center justify-between border rounded px-2 py-1 text-xs text-left transition-colors ${
            open ? "ring-1 ring-brand border-brand" : "hover:border-gray-400"
          }`
        }>
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {display}
        </span>
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}>
            <CalendarBody
              value={value}
              onChange={onChange}
              onClose={() => setOpen(false)}
              minDate={minDate}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export default DatePickerInput;
