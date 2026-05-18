"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import type { TransferQueryParams } from "@/lib/api/transfers";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

interface TransferSidebarProps {
  filters: TransferQueryParams;
  onFiltersChange: (filters: TransferQueryParams) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    value: "1",
    label: "Phiếu tạm",
    color: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  {
    value: "2",
    label: "Đang chuyển",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  {
    value: "3",
    label: "Đã nhận",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "4",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const PRESET_GROUPS = [
  {
    label: "Theo ngày",
    options: [
      { value: "today", label: "Hôm nay" },
      { value: "yesterday", label: "Hôm qua" },
    ],
  },
  {
    label: "Theo tuần",
    options: [
      { value: "this_week", label: "Tuần này" },
      { value: "last_week", label: "Tuần trước" },
    ],
  },
  {
    label: "Theo tháng",
    options: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
    ],
  },
  {
    label: "Khoảng cách",
    options: [
      { value: "last_7_days", label: "7 ngày qua" },
      { value: "last_30_days", label: "30 ngày qua" },
    ],
  },
  {
    label: "Theo năm",
    options: [
      { value: "this_year", label: "Năm nay" },
      { value: "last_year", label: "Năm trước" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  last_7_days: "7 ngày qua",
  last_30_days: "30 ngày qua",
  this_year: "Năm nay",
  last_year: "Năm trước",
  all_time: "Tất cả",
};

const MONTH_NAMES = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDateRangeFromPreset = (preset: string): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const d = new Date(today.getTime() - 86400000);
      return { from: d, to: today };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() + 1);
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() - 6);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { from: s, to: e };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31),
      };
    default:
      return { from: today, to: now };
  }
};

// ─── PresetPanel ──────────────────────────────────────────────────────────────
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof window === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: anchorRect.top,
        left: anchorRect.right + 8,
        zIndex: 9999,
      }}
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
                  ? "bg-blue-600 text-white border-blue-600 font-medium shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
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

// ─── MiniCalendar ─────────────────────────────────────────────────────────────
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
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
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
          const isDisabled = minDate ? ds < minDate : false;
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
                  ? "bg-blue-600 text-white font-bold"
                  : isToday
                    ? "border border-blue-400 text-blue-600 font-semibold hover:bg-blue-50"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-blue-50 cursor-pointer",
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
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────
function StatusDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: typeof STATUS_OPTIONS;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${open ? "border-blue-400 ring-2 ring-blue-100" : "hover:border-gray-400"} bg-white`}>
        {selected ? (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${selected.color}`}>
            {selected.label}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${!value ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-500"}`}>
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5 text-blue-500" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${value === opt.value ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
              />
              <span
                className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SimpleDropdown ───────────────────────────────────────────────────────────
interface SimpleOption {
  value: string;
  label: string;
}
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: SimpleOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${open ? "border-blue-400 ring-2 ring-blue-100" : "hover:border-gray-400"} bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${!value ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-500"}`}>
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5 text-blue-500" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}>
              <span className="truncate">{opt.label}</span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TransferSidebar({
  filters,
  onFiltersChange,
}: TransferSidebarProps) {
  const { data: branches } = useBranches();

  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [enableTransferDate, setEnableTransferDate] = useState(true);
  const [enableReceiveDate, setEnableReceiveDate] = useState(false);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const activeBranchOptions = useMemo<SimpleOption[]>(
    () =>
      branches
        ?.filter((b) => b.isActive)
        .map((b) => ({ value: String(b.id), label: b.name })) ?? [],
    [branches]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (fromBranchId) n++;
    if (toBranchId) n++;
    if (selectedStatus) n++;
    if (enableTransferDate || enableReceiveDate) n++;
    return n;
  }, [
    fromBranchId,
    toBranchId,
    selectedStatus,
    enableTransferDate,
    enableReceiveDate,
  ]);

  // Đóng MiniCalendar khi click ngoài
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

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: TransferQueryParams = {};
      if (fromBranchId) f.fromBranchIds = [parseInt(fromBranchId)];
      if (toBranchId) f.toBranchIds = [parseInt(toBranchId)];
      if (selectedStatus) f.status = [parseInt(selectedStatus)];

      if (enableTransferDate || enableReceiveDate) {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? {
                  from: new Date(fromDate + "T00:00:00"),
                  to: new Date(toDate + "T23:59:59"),
                }
              : getDateRangeFromPreset("this_month");

        if (enableTransferDate) {
          f.fromTransferDate = range.from.toISOString();
          f.toTransferDate = range.to.toISOString();
        }
        if (enableReceiveDate) {
          f.fromReceivedDate = range.from.toISOString();
          f.toReceivedDate = range.to.toISOString();
        }
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    fromBranchId,
    toBranchId,
    selectedStatus,
    enableTransferDate,
    enableReceiveDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const resetFilters = () => {
    setFromBranchId("");
    setToBranchId("");
    setSelectedStatus("");
    setEnableTransferDate(true);
    setEnableReceiveDate(false);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  return (
    <aside className="w-72 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Thời gian ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Thời gian
          </label>

          {/* Loại ngày toggle */}
          <div className="flex gap-3 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enableTransferDate}
                onChange={(e) => setEnableTransferDate(e.target.checked)}
                className="cursor-pointer accent-blue-600"
              />
              Ngày chuyển
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enableReceiveDate}
                onChange={(e) => setEnableReceiveDate(e.target.checked)}
                className="cursor-pointer accent-blue-600"
              />
              Ngày nhận
            </label>
          </div>

          <div className="space-y-1.5">
            {/* Preset row */}
            <div
              ref={presetRowRef}
              onClick={() => {
                setDateMode("preset");
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
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dateMode === "preset" ? "border-blue-600" : "border-gray-300"}`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 ${showPresetPanel ? "text-blue-500" : "text-gray-400"}`}
              />
            </div>

            {/* Custom date row */}
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${
                dateMode === "custom"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dateMode === "custom" ? "border-blue-600" : "border-gray-300"}`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                Tùy chỉnh
              </span>
            </div>

            {/* Custom date inputs */}
            {dateMode === "custom" && (
              <div ref={customDateRef} className="space-y-1.5 pt-1">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;
                  return (
                    <div key={field}>
                      <span className="text-xs text-gray-500 mb-1 block">
                        {isFrom ? "Từ ngày" : "Đến ngày"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${val ? "border-blue-300 bg-blue-50 text-gray-800" : "border-gray-200 text-gray-400"} ${isOpen ? "ring-2 ring-blue-100 border-blue-400" : "hover:border-gray-300"}`}>
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
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <StatusDropdown
            options={STATUS_OPTIONS}
            value={selectedStatus}
            placeholder="Tất cả trạng thái"
            onChange={setSelectedStatus}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh chuyển đi ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chuyển đi
          </label>
          <SimpleDropdown
            options={activeBranchOptions}
            value={fromBranchId}
            placeholder="Tất cả chi nhánh"
            onChange={setFromBranchId}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh nhận về ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhận về
          </label>
          <SimpleDropdown
            options={activeBranchOptions}
            value={toBranchId}
            placeholder="Tất cả chi nhánh"
            onChange={setToBranchId}
          />
        </div>
      </div>

      {/* PresetPanel portal */}
      {showPresetPanel && (
        <PresetPanel
          groups={PRESET_GROUPS}
          selected={selectedPreset}
          onSelect={(v) => {
            setSelectedPreset(v);
            setDateMode("preset");
          }}
          onClose={() => setShowPresetPanel(false)}
          anchorRect={panelAnchorRect}
          triggerRef={presetRowRef}
        />
      )}
    </aside>
  );
}
