// components/shared/TimeRangeFilter.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export const PRESET_GROUPS = [
  {
    label: "Tất cả",
    options: [{ label: "Toàn thời gian", value: "all_time" }],
  },
  {
    label: "Theo ngày",
    options: [
      { label: "Hôm nay", value: "today" },
      { label: "Hôm qua", value: "yesterday" },
    ],
  },
  {
    label: "Theo tuần",
    options: [
      { label: "Tuần này", value: "this_week" },
      { label: "Tuần trước", value: "last_week" },
      { label: "7 ngày qua", value: "last_7_days" },
    ],
  },
  {
    label: "Theo tháng",
    options: [
      { label: "Tháng này", value: "this_month" },
      { label: "Tháng trước", value: "last_month" },
      { label: "30 ngày qua", value: "last_30_days" },
    ],
  },
  {
    label: "Theo quý",
    options: [
      { label: "Quý này", value: "this_quarter" },
      { label: "Quý trước", value: "last_quarter" },
    ],
  },
  {
    label: "Theo năm",
    options: [
      { label: "Năm nay", value: "this_year" },
      { label: "Năm trước", value: "last_year" },
    ],
  },
];

export const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);

const MONTH_NAMES = [
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
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today.getTime() - 86400000);
      return { from: y, to: new Date(y.getTime() + 86400000 - 1) };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: s, to: now };
    }
    case "last_week": {
      const e = new Date(today);
      e.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 1);
      const s = new Date(e);
      s.setDate(e.getDate() - 6);
      return { from: s, to: endOfDay(e) };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
    }
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const s =
        q === 0
          ? new Date(now.getFullYear() - 1, 9, 1)
          : new Date(now.getFullYear(), (q - 1) * 3, 1);
      const e = new Date(now.getFullYear(), q * 3, 0);
      return { from: s, to: endOfDay(e) };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    default:
      return { from: today, to: now };
  }
};

// Đổi một TimeRangeState → { from, to } dạng ISO để gửi backend.
// Trả null khi đang ở "all_time" / chưa chọn gì (không áp filter thời gian).
export const rangeToIso = (r: {
  dateMode: "preset" | "custom";
  selectedPreset: string;
  fromDate: string;
  toDate: string;
}): { from: string; to: string } | null => {
  if (r.selectedPreset === "all_time" && r.dateMode !== "custom") return null;
  const range =
    r.dateMode === "preset"
      ? getDateRangeFromPreset(r.selectedPreset)
      : r.fromDate && r.toDate
        ? {
            from: new Date(r.fromDate + "T00:00:00"),
            to: new Date(r.toDate + "T23:59:59.999"),
          }
        : getDateRangeFromPreset("this_month");
  return { from: range.from.toISOString(), to: range.to.toISOString() };
};

// ─── PresetPanel (portal) ────────────────────────────────────────────────────
function PresetPanel({
  groups,
  selected,
  onSelect,
  onClose,
  anchorRect,
  triggerRef,
}: {
  groups: typeof PRESET_GROUPS;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const insidePanel = panelRef.current?.contains(e.target as Node);
      const insideTrigger = triggerRef.current?.contains(e.target as Node);
      if (!insidePanel && !insideTrigger) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof window === "undefined") return null;

  const left = anchorRect.right + 8;
  const top = anchorRect.top;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex gap-5 animate-in fade-in zoom-in-95 duration-150">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 min-w-[88px]">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {group.label}
          </span>
          {group.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all whitespace-nowrap text-left ${
                selected === opt.value
                  ? "bg-brand text-white border-brand font-medium shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── MiniCalendar ────────────────────────────────────────────────────────────
function MiniCalendar({
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
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm select-none">
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
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>
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
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

// ─── TimeRangeFilter (controlled — dùng chung cho "mua hàng" & "tạo") ────────
export interface TimeRangeState {
  dateMode: "preset" | "custom";
  selectedPreset: string;
  fromDate: string;
  toDate: string;
}
export function TimeRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TimeRangeState;
  onChange: (next: TimeRangeState) => void;
}) {
  const { dateMode, selectedPreset, fromDate, toDate } = value;
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      if (
        customDateRef.current &&
        !customDateRef.current.contains(e.target as Node)
      )
        setOpenCal(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
      </div>

      <div className="space-y-1.5">
        {/* Row Preset */}
        <div
          ref={presetRowRef}
          onClick={() => {
            onChange({ ...value, dateMode: "preset" });
            setOpenCal(null);
            if (showPresetPanel) {
              setShowPresetPanel(false);
            } else {
              setPanelAnchorRect(
                presetRowRef.current?.getBoundingClientRect() ?? null
              );
              setShowPresetPanel(true);
            }
          }}
          className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${
            dateMode === "preset"
              ? "border-brand bg-brand-soft"
              : "border-gray-200 hover:border-gray-300"
          }`}>
          <div
            className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              dateMode === "preset" ? "border-brand" : "border-gray-300"
            }`}>
            {dateMode === "preset" && (
              <div className="w-1 h-1 rounded-full bg-brand" />
            )}
          </div>
          <span className="text-sm text-gray-700 flex-1 font-medium">
            {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
          </span>
          <ChevronRight
            className={`w-4 h-4 transition-colors flex-shrink-0 ${
              showPresetPanel ? "text-brand" : "text-gray-400"
            }`}
          />
        </div>

        {/* Row Tùy chỉnh */}
        <div
          onClick={() => {
            onChange({ ...value, dateMode: "custom" });
            setShowPresetPanel(false);
          }}
          className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${
            dateMode === "custom"
              ? "border-brand bg-brand-soft"
              : "border-gray-200 hover:border-gray-300"
          }`}>
          <div
            className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              dateMode === "custom" ? "border-brand" : "border-gray-300"
            }`}>
            {dateMode === "custom" && (
              <div className="w-1 h-1 rounded-full bg-brand" />
            )}
          </div>
          <span className="text-sm text-gray-700 flex-1">Tùy chỉnh</span>
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>

        {dateMode === "custom" && (
          <div ref={customDateRef} className="space-y-2 pt-1">
            {(["from", "to"] as const).map((field) => {
              const isFrom = field === "from";
              const val = isFrom ? fromDate : toDate;
              const fieldLabel = isFrom ? "Từ ngày" : "Đến ngày";
              const setVal = (d: string) =>
                onChange(
                  isFrom ? { ...value, fromDate: d } : { ...value, toDate: d }
                );
              const isOpen = openCal === field;
              return (
                <div key={field}>
                  <span className="text-xs text-gray-500 mb-1 block">
                    {fieldLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenCal(isOpen ? null : field)}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                      val
                        ? "border-brand bg-brand-soft text-gray-800"
                        : "border-gray-200 text-gray-400"
                    } ${isOpen ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
                    <span>
                      {val
                        ? new Date(val + "T00:00:00").toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                        : "Chọn ngày"}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {isOpen && (
                    <MiniCalendar
                      value={val}
                      onChange={setVal}
                      onClose={() => setOpenCal(null)}
                      minDate={
                        field === "to" ? fromDate || undefined : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showPresetPanel && (
          <PresetPanel
            groups={PRESET_GROUPS}
            selected={selectedPreset}
            onSelect={(v) => onChange({ ...value, selectedPreset: v })}
            onClose={() => setShowPresetPanel(false)}
            anchorRect={panelAnchorRect}
            triggerRef={presetRowRef}
          />
        )}
      </div>
    </div>
  );
}
