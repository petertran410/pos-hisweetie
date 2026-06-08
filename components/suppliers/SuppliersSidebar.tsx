"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar,
} from "lucide-react";
import { useSupplierGroups } from "@/lib/hooks/useSuppliers";
import { SupplierFilters, SupplierGroup } from "@/lib/types/supplier";
import { SupplierGroupModal } from "./SupplierGroupModal";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
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

const PRESET_GROUPS = [
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
      { label: "Năm này", value: "this_year" },
      { label: "Năm trước", value: "last_year" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = {
  all_time: "Toàn thời gian",
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  last_30_days: "30 ngày qua",
  this_quarter: "Quý này",
  last_quarter: "Quý trước",
  this_year: "Năm này",
  last_year: "Năm trước",
};

function getDateRangeFromPreset(
  preset: string
): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "all_time":
      return null;
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { from: y, to: new Date(y.getTime() + 86399999) };
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
      return { from: s, to: e };
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
      return {
        from: new Date(now.getFullYear(), (q - 1) * 3, 1),
        to: new Date(now.getFullYear(), q * 3, 0, 23, 59, 59),
      };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    default:
      return null;
  }
}

// ─── SortDropdown ─────────────────────────────────────────────────────────────
function SortDropdown({
  value,
  onChange,
}: {
  value: "none" | "desc" | "asc";
  onChange: (v: "none" | "desc" | "asc") => void;
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

  const OPTIONS = [
    { value: "none" as const, label: "Mặc định" },
    { value: "desc" as const, label: "Nhiều nhất" },
    { value: "asc" as const, label: "Thấp nhất" },
  ];
  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${
          value !== "none"
            ? "border-brand bg-brand-soft text-brand-dark"
            : "border-gray-200 text-gray-500 hover:border-gray-300"
        }`}>
        <span>{selected?.label}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[110px] overflow-hidden">
          {OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                opt.value === value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatusButtons ────────────────────────────────────────────────────────────
function StatusButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              value === opt.value
                ? "bg-brand text-white border-brand shadow-sm"
                : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
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
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all bg-white ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        }`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${!value ? "bg-brand-soft text-brand-dark font-medium" : "hover:bg-gray-50 text-gray-500"}`}>
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5 text-brand" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${
                value === opt.value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}>
              <span className="truncate">{opt.label}</span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PresetPanel (portal) ─────────────────────────────────────────────────────
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

// ─── MiniCalendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
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
  const today = new Date();
  const todayObj = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const [viewYear, setViewYear] = useState(
    value ? new Date(value + "T00:00:00").getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(value + "T00:00:00").getMonth() : today.getMonth()
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = () =>
    viewMonth === 0
      ? (setViewMonth(11), setViewYear((y) => y - 1))
      : setViewMonth((m) => m - 1);
  const next = () =>
    viewMonth === 11
      ? (setViewMonth(0), setViewYear((y) => y + 1))
      : setViewMonth((m) => m + 1);

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
          {MONTH_NAMES[viewMonth]} {viewYear}
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
            todayObj.getFullYear() === viewYear &&
            todayObj.getMonth() === viewMonth &&
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
              className={`aspect-square rounded-full text-xs flex items-center justify-center transition-all ${
                isSel
                  ? "bg-brand text-white font-semibold"
                  : isToday
                    ? "bg-brand-soft text-brand-dark font-semibold"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SuppliersSidebarProps {
  filters: SupplierFilters;
  onFiltersChange: (filters: SupplierFilters) => void;
}

export function SuppliersSidebar({
  filters,
  onFiltersChange,
}: SuppliersSidebarProps) {
  const { data: groupsData } = useSupplierGroups();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupplierGroup | undefined>();

  // Date
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  // Range inputs — local string state, applied on blur
  const [totalInvoicedFrom, setTotalInvoicedFrom] = useState<
    number | undefined
  >();
  const [totalInvoicedTo, setTotalInvoicedTo] = useState<number | undefined>();
  const [debtFrom, setDebtFrom] = useState<number | undefined>();
  const [debtTo, setDebtTo] = useState<number | undefined>();

  const [isActive, setIsActive] = useState(
    filters.isActive === false ? "false" : "true"
  );

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const groupOptions = useMemo<SimpleOption[]>(
    () =>
      groupsData?.data?.map((g: SupplierGroup) => ({
        value: String(g.id),
        label: g.name,
      })) ?? [],
    [groupsData]
  );

  const [purchasedSort, setPurchasedSort] = useState<"none" | "desc" | "asc">(
    "none"
  );
  const [debtSort, setDebtSort] = useState<"none" | "desc" | "asc">("none");

  const handlePurchasedSort = (v: "none" | "desc" | "asc") => {
    setPurchasedSort(v);
    if (v !== "none") setDebtSort("none");
  };
  const handleDebtSort = (v: "none" | "desc" | "asc") => {
    setDebtSort(v);
    if (v !== "none") setPurchasedSort("none");
  };

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

  const applyPreset = (preset: string) => {
    const range = getDateRangeFromPreset(preset);
    onFiltersChange({
      ...filters,
      createdDateFrom: range?.from.toISOString(),
      createdDateTo: range?.to.toISOString(),
      currentItem: 0,
    });
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.groupId) n++;
    if (filters.createdDateFrom) n++;
    if (totalInvoicedFrom !== undefined || totalInvoicedTo !== undefined) n++;
    if (debtFrom !== undefined || debtTo !== undefined) n++;
    if (isActive !== "true") n++;
    if (purchasedSort !== "none") n++;
    if (debtSort !== "none") n++;
    return n;
  }, [
    filters.groupId,
    filters.createdDateFrom,
    totalInvoicedFrom,
    totalInvoicedTo,
    debtFrom,
    debtTo,
    isActive,
    purchasedSort,
    debtSort,
  ]);

  const resetFilters = () => {
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    setTotalInvoicedFrom(undefined);
    setTotalInvoicedTo(undefined);
    setDebtFrom(undefined);
    setDebtTo(undefined);
    setPurchasedSort("none");
    setDebtSort("none");
    setIsActive("true");
    onFiltersChange({
      pageSize: filters.pageSize ?? 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
      isActive: true,
      includeSupplierGroup: true,
    });
  };

  // Debounce emit filters (giống CustomersSidebar)
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: SupplierFilters = {
        pageSize: filters.pageSize ?? 15,
        currentItem: 0,
        orderBy:
          purchasedSort !== "none"
            ? "totalInvoiced"
            : debtSort !== "none"
              ? "debt"
              : "createdAt",
        orderDirection:
          purchasedSort !== "none"
            ? purchasedSort
            : debtSort !== "none"
              ? debtSort
              : "desc",
        includeSupplierGroup: true,
        // Giữ nguyên date filters từ filters prop (vẫn apply immediate)
        createdDateFrom: filters.createdDateFrom,
        createdDateTo: filters.createdDateTo,
      };

      if (filters.groupId) f.groupId = filters.groupId;
      if (isActive === "true") f.isActive = true;
      else if (isActive === "false") f.isActive = false;
      if (totalInvoicedFrom !== undefined)
        f.totalInvoicedFrom = totalInvoicedFrom;
      if (totalInvoicedTo !== undefined) f.totalInvoicedTo = totalInvoicedTo;
      if (debtFrom !== undefined) f.debtFrom = debtFrom;
      if (debtTo !== undefined) f.debtTo = debtTo;

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    isActive,
    totalInvoicedFrom,
    totalInvoicedTo,
    debtFrom,
    debtTo,
    purchasedSort,
    debtSort,
  ]);

  return (
    <aside className="w-72 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Thời gian ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Thời gian tạo
          </label>
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
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dateMode === "preset" ? "border-brand" : "border-gray-300"}`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 ${showPresetPanel ? "text-brand" : "text-gray-400"}`}
              />
            </div>

            {/* Tùy chỉnh row */}
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${
                dateMode === "custom"
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dateMode === "custom" ? "border-brand" : "border-gray-300"}`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                Tùy chỉnh
              </span>
            </div>

            {dateMode === "custom" && (
              <div className="space-y-1.5 pl-1" ref={customDateRef}>
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;
                  return (
                    <div key={field}>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${
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
                            : isFrom
                              ? "Từ ngày"
                              : "Đến ngày"}
                        </span>
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                      {isOpen && (
                        <MiniCalendar
                          value={val}
                          onChange={(v) => {
                            setVal(v);
                            const newFrom = isFrom ? v : fromDate;
                            const newTo = isFrom ? toDate : v;
                            if (newFrom && newTo) {
                              onFiltersChange({
                                ...filters,
                                createdDateFrom: new Date(
                                  newFrom + "T00:00:00"
                                ).toISOString(),
                                createdDateTo: new Date(
                                  newTo + "T23:59:59"
                                ).toISOString(),
                                currentItem: 0,
                              });
                            }
                          }}
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

        {/* ── Nhóm nhà cung cấp ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Nhóm nhà cung cấp
            </label>
            <button
              onClick={() => {
                setEditingGroup(undefined);
                setShowGroupModal(true);
              }}
              className="text-xs text-brand hover:text-brand-dark font-medium">
              Quản lý
            </button>
          </div>
          <SimpleDropdown
            options={groupOptions}
            value={filters.groupId ? String(filters.groupId) : ""}
            placeholder="Tất cả nhóm"
            onChange={(v) =>
              onFiltersChange({
                ...filters,
                groupId: v ? Number(v) : undefined,
                currentItem: 0,
              })
            }
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Tổng mua ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Tổng mua
            </label>
            <SortDropdown
              value={purchasedSort}
              onChange={handlePurchasedSort}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Từ"
              className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={totalInvoicedFrom ?? ""}
              onChange={(e) =>
                setTotalInvoicedFrom(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
            <input
              type="number"
              placeholder="Đến"
              className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={totalInvoicedTo ?? ""}
              onChange={(e) =>
                setTotalInvoicedTo(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Nợ hiện tại ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Nợ hiện tại
            </label>
            <SortDropdown value={debtSort} onChange={handleDebtSort} />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Từ"
              className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={debtFrom ?? ""}
              onChange={(e) =>
                setDebtFrom(e.target.value ? Number(e.target.value) : undefined)
              }
            />
            <input
              type="number"
              placeholder="Đến"
              className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              value={debtTo ?? ""}
              onChange={(e) =>
                setDebtTo(e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái ── */}
        <StatusButtons
          label="Trạng thái"
          options={[
            { value: "true", label: "Đang hoạt động" },
            { value: "false", label: "Ngừng HĐ" },
            { value: "all", label: "Tất cả" },
          ]}
          value={isActive}
          onChange={setIsActive}
        />
      </div>

      {/* PresetPanel portal */}
      {showPresetPanel && (
        <PresetPanel
          groups={PRESET_GROUPS}
          selected={selectedPreset}
          onSelect={(v) => {
            setSelectedPreset(v);
            setDateMode("preset");
            applyPreset(v);
          }}
          onClose={() => setShowPresetPanel(false)}
          anchorRect={panelAnchorRect}
          triggerRef={presetRowRef}
        />
      )}

      {showGroupModal && (
        <SupplierGroupModal
          group={editingGroup}
          onClose={() => {
            setShowGroupModal(false);
            setEditingGroup(undefined);
          }}
        />
      )}
    </aside>
  );
}
