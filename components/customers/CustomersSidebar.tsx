"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { CustomerFilters } from "@/lib/types/customer";
import {
  ChevronDown,
  X,
  Search,
  Pencil,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CustomerGroupForm } from "./CustomerGroupForm";
import { createPortal } from "react-dom";

interface CustomersSidebarProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
}

// ─── SimpleDropdown (giống OrdersSidebar) ─────────────────────────────────────
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
  searchable = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between px-2 py-1 border rounded-lg text-sm cursor-pointer transition-all ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          )}
          {filtered.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value === value ? "" : opt.value);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              {opt.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-gray-500 text-center text-sm">
              Không tìm thấy
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GroupDropdown (searchable + edit button, riêng Customer) ──────────────────
function GroupDropdown({
  groups,
  value,
  onChange,
  onEdit,
  onCreate,
}: {
  groups: {
    id: number;
    name: string;
    discount?: number;
    description?: string;
  }[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  onEdit: (e: React.MouseEvent, group: any) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const selected = groups.find((g) => g.id === value);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Nhóm khách hàng
        </label>
        <button
          onClick={onCreate}
          className="text-xs text-brand hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" />
          Tạo nhóm
        </button>
      </div>

      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between px-2 py-1 border rounded-lg text-sm cursor-pointer transition-all ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.name : "Tất cả các nhóm"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                !value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}>
              Tất cả các nhóm
            </button>
            {filtered.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between hover:bg-gray-50 ${
                  value === group.id
                    ? "bg-brand-soft text-brand-dark"
                    : "text-gray-700"
                }`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(value === group.id ? undefined : group.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex-1 px-3 py-2.5 text-left text-sm">
                  {group.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => onEdit(e, group)}
                  className="px-3 py-2 text-gray-400 hover:text-brand">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RangeInput (cho tổng bán, công nợ, điểm) ────────────────────────────────
function RangeInput({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: {
  label: string;
  fromValue: number | undefined;
  toValue: number | undefined;
  onFromChange: (v: number | undefined) => void;
  onToChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Từ"
          className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          value={fromValue ?? ""}
          onChange={(e) =>
            onFromChange(e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <input
          type="number"
          placeholder="Đến"
          className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          value={toValue ?? ""}
          onChange={(e) =>
            onToChange(e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>
    </div>
  );
}

// ─── SortDropdown (custom, không dùng native select) ─────────────────────────
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

// ─── StatusButtons (cho loại KH, giới tính, trạng thái) ──────────────────────
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

// ─── Date filter constants (giống OrdersSidebar) ─────────────────────────────
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

const PRESET_LABELS: Record<string, string> = Object.fromEntries(
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

const getDateRangeFromPreset = (preset: string) => {
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
      s.setDate(today.getDate() - today.getDay());
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { from: s, to: endOfDay(e) };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
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
      const e =
        q === 0
          ? new Date(now.getFullYear() - 1, 11, 31)
          : new Date(now.getFullYear(), q * 3, 0);
      return { from: s, to: endOfDay(e) };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
      };
    default:
      return { from: today, to: now };
  }
};

// ─── PresetPanel (portal, giống OrdersSidebar) ───────────────────────────────
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
      const insidePanel = ref.current?.contains(e.target as Node);
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
      ref={ref}
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

// ─── MiniCalendar (giống OrdersSidebar) ──────────────────────────────────────
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

// ─── DateFilterBlock (tái sử dụng cho cả 2 filter ngày) ─────────────────────
function DateFilterBlock({
  label,
  dateMode,
  setDateMode,
  selectedPreset,
  setSelectedPreset,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  showPresetPanel,
  setShowPresetPanel,
  panelAnchorRect,
  setPanelAnchorRect,
  openCal,
  setOpenCal,
  presetRowRef,
  customDateRef,
}: {
  label: string;
  dateMode: "preset" | "custom";
  setDateMode: (v: "preset" | "custom") => void;
  selectedPreset: string;
  setSelectedPreset: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  showPresetPanel: boolean;
  setShowPresetPanel: (v: boolean) => void;
  panelAnchorRect: DOMRect | null;
  setPanelAnchorRect: (v: DOMRect | null) => void;
  openCal: "from" | "to" | null;
  setOpenCal: (v: "from" | "to" | null) => void;
  presetRowRef: React.RefObject<HTMLDivElement | null>;
  customDateRef: React.RefObject<HTMLDivElement | null>;
}) {
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

        {/* Custom row */}
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

        {/* Custom date fields */}
        {dateMode === "custom" && (
          <div ref={customDateRef} className="space-y-2 pt-1">
            {(["from", "to"] as const).map((field) => {
              const isFrom = field === "from";
              const val = isFrom ? fromDate : toDate;
              const labelText = isFrom ? "Từ ngày" : "Đến ngày";
              const setVal = isFrom ? setFromDate : setToDate;
              const isOpen = openCal === field;
              return (
                <div key={field}>
                  <span className="text-xs text-gray-500 mb-1 block">
                    {labelText}
                  </span>
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

        {/* PresetPanel portal */}
        {showPresetPanel && (
          <PresetPanel
            groups={PRESET_GROUPS}
            selected={selectedPreset}
            onSelect={setSelectedPreset}
            onClose={() => setShowPresetPanel(false)}
            anchorRect={panelAnchorRect}
            triggerRef={presetRowRef}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function CustomersSidebar({
  filters,
  onFiltersChange,
}: CustomersSidebarProps) {
  const { data: groupsData } = useCustomerGroups();

  // ─── Local state ───
  const [groupId, setGroupId] = useState<number | undefined>(filters.groupId);
  const [customerType, setCustomerType] = useState("all");
  const [gender, setGender] = useState("all");
  const [isActive, setIsActive] = useState("true"); // "true" | "false" | "all"
  const [totalPurchasedFrom, setTotalPurchasedFrom] = useState<
    number | undefined
  >();
  const [totalPurchasedTo, setTotalPurchasedTo] = useState<
    number | undefined
  >();
  const [debtFrom, setDebtFrom] = useState<number | undefined>();
  const [debtTo, setDebtTo] = useState<number | undefined>();
  const [pointFrom, setPointFrom] = useState<number | undefined>();
  const [pointTo, setPointTo] = useState<number | undefined>();

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  // ─── Date filter: Ngày tạo KH ───
  const [createdDateMode, setCreatedDateMode] = useState<"preset" | "custom">(
    "preset"
  );
  const [createdPreset, setCreatedPreset] = useState("all_time");
  const [createdFromDate, setCreatedFromDate] = useState("");
  const [createdToDate, setCreatedToDate] = useState("");
  const [showCreatedPresetPanel, setShowCreatedPresetPanel] = useState(false);
  const [createdPanelAnchorRect, setCreatedPanelAnchorRect] =
    useState<DOMRect | null>(null);
  const [openCreatedCal, setOpenCreatedCal] = useState<"from" | "to" | null>(
    null
  );
  const createdPresetRowRef = useRef<HTMLDivElement>(null);
  const createdCustomDateRef = useRef<HTMLDivElement>(null);

  // ─── Date filter: Ngày giao dịch cuối ───
  const [lastTxDateMode, setLastTxDateMode] = useState<"preset" | "custom">(
    "preset"
  );
  const [lastTxPreset, setLastTxPreset] = useState("all_time");
  const [lastTxFromDate, setLastTxFromDate] = useState("");
  const [lastTxToDate, setLastTxToDate] = useState("");
  const [showLastTxPresetPanel, setShowLastTxPresetPanel] = useState(false);
  const [lastTxPanelAnchorRect, setLastTxPanelAnchorRect] =
    useState<DOMRect | null>(null);
  const [openLastTxCal, setOpenLastTxCal] = useState<"from" | "to" | null>(
    null
  );

  // ─── Sort ───
  const [purchasedSort, setPurchasedSort] = useState<"none" | "desc" | "asc">(
    "none"
  );
  const [debtSort, setDebtSort] = useState<"none" | "desc" | "asc">("none");

  const lastTxPresetRowRef = useRef<HTMLDivElement>(null);
  const lastTxCustomDateRef = useRef<HTMLDivElement>(null);

  const handlePurchasedSort = (v: "none" | "desc" | "asc") => {
    setPurchasedSort(v);
    if (v !== "none") setDebtSort("none");
  };

  const handleDebtSort = (v: "none" | "desc" | "asc") => {
    setDebtSort(v);
    if (v !== "none") setPurchasedSort("none");
  };

  // ─── Active filter count ───
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (groupId) count++;
    if (customerType !== "all") count++;
    if (gender !== "all") count++;
    if (isActive !== "true") count++;
    if (totalPurchasedFrom !== undefined || totalPurchasedTo !== undefined)
      count++;
    if (debtFrom !== undefined || debtTo !== undefined) count++;
    if (pointFrom !== undefined || pointTo !== undefined) count++;
    if (createdPreset !== "all_time" || createdDateMode === "custom") count++;
    if (lastTxPreset !== "all_time" || lastTxDateMode === "custom") count++;
    if (purchasedSort !== "none") count++;
    if (debtSort !== "none") count++;
    return count;
  }, [
    groupId,
    customerType,
    gender,
    isActive,
    totalPurchasedFrom,
    totalPurchasedTo,
    debtFrom,
    debtTo,
    pointFrom,
    pointTo,
    createdPreset,
    createdDateMode,
    lastTxPreset,
    lastTxDateMode,
    purchasedSort,
    debtSort,
  ]);

  // ─── Debounce emit filters (giống OrdersSidebar) ───
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: CustomerFilters = {
        pageSize: 15,
        currentItem: 0,
        orderBy:
          purchasedSort !== "none"
            ? "totalPurchased"
            : debtSort !== "none"
              ? "totalDebt"
              : "createdAt",
        orderDirection:
          purchasedSort !== "none"
            ? purchasedSort
            : debtSort !== "none"
              ? debtSort
              : "desc",
        includeCustomerGroup: true,
      };

      if (groupId) f.groupId = groupId;
      if (isActive === "true") f.isActive = true;
      else if (isActive === "false") f.isActive = false;
      else f.includeInactive = true; // "all" → lấy cả KH hoạt động & ngừng HĐ

      if (totalPurchasedFrom !== undefined)
        f.totalPurchasedFrom = totalPurchasedFrom;
      if (totalPurchasedTo !== undefined) f.totalPurchasedTo = totalPurchasedTo;
      if (debtFrom !== undefined) f.debtFrom = debtFrom;
      if (debtTo !== undefined) f.debtTo = debtTo;

      // ── Ngày tạo KH ──
      if (createdDateMode === "preset") {
        if (createdPreset !== "all_time") {
          const r = getDateRangeFromPreset(createdPreset);
          f.createdDateFrom = r.from.toISOString();
          f.createdDateTo = r.to.toISOString();
        }
      } else if (
        createdDateMode === "custom" &&
        createdFromDate &&
        createdToDate
      ) {
        f.createdDateFrom = new Date(createdFromDate + "T00:00:00").toISOString();
        f.createdDateTo = new Date(createdToDate + "T23:59:59.999").toISOString();
      }

      // ── Ngày giao dịch cuối ──
      if (lastTxDateMode === "preset") {
        if (lastTxPreset !== "all_time") {
          const r = getDateRangeFromPreset(lastTxPreset);
          f.lastTransactionFrom = r.from.toISOString();
          f.lastTransactionTo = r.to.toISOString();
        }
      } else if (
        lastTxDateMode === "custom" &&
        lastTxFromDate &&
        lastTxToDate
      ) {
        f.lastTransactionFrom = new Date(lastTxFromDate + "T00:00:00").toISOString();
        f.lastTransactionTo = new Date(lastTxToDate + "T23:59:59.999").toISOString();
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    groupId,
    customerType,
    gender,
    isActive,
    totalPurchasedFrom,
    totalPurchasedTo,
    debtFrom,
    debtTo,
    pointFrom,
    pointTo,
    createdDateMode,
    createdPreset,
    createdFromDate,
    createdToDate,
    lastTxDateMode,
    lastTxPreset,
    lastTxFromDate,
    lastTxToDate,
    purchasedSort,
    debtSort,
  ]);

  // ─── Clear all ───
  const clearAll = () => {
    setGroupId(undefined);
    setCustomerType("all");
    setGender("all");
    setIsActive("true");
    setTotalPurchasedFrom(undefined);
    setTotalPurchasedTo(undefined);
    setDebtFrom(undefined);
    setDebtTo(undefined);
    setPointFrom(undefined);
    setPointTo(undefined);
    setCreatedDateMode("preset");
    setCreatedPreset("all_time");
    setCreatedFromDate("");
    setCreatedToDate("");
    setLastTxDateMode("preset");
    setLastTxPreset("all_time");
    setLastTxFromDate("");
    setLastTxToDate("");
    setPurchasedSort("none");
    setDebtSort("none");
  };

  const handleEditGroup = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  return (
    <>
      <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
        {/* Header (giống OrdersSidebar) */}
        <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-brand hover:text-brand-dark font-medium">
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {/* ── Nhóm khách hàng ── */}
          <GroupDropdown
            groups={groupsData?.data || []}
            value={groupId}
            onChange={setGroupId}
            onEdit={handleEditGroup}
            onCreate={() => {
              setEditingGroup(null);
              setShowGroupForm(true);
            }}
          />

          <div className="border-t border-gray-100" />

          {/* ── Ngày tạo khách hàng ── */}
          <DateFilterBlock
            label="Thời gian"
            dateMode={createdDateMode}
            setDateMode={setCreatedDateMode}
            selectedPreset={createdPreset}
            setSelectedPreset={setCreatedPreset}
            fromDate={createdFromDate}
            setFromDate={setCreatedFromDate}
            toDate={createdToDate}
            setToDate={setCreatedToDate}
            showPresetPanel={showCreatedPresetPanel}
            setShowPresetPanel={setShowCreatedPresetPanel}
            panelAnchorRect={createdPanelAnchorRect}
            setPanelAnchorRect={setCreatedPanelAnchorRect}
            openCal={openCreatedCal}
            setOpenCal={setOpenCreatedCal}
            presetRowRef={createdPresetRowRef}
            customDateRef={createdCustomDateRef}
          />

          <div className="border-t border-gray-100" />

          {/* ── Ngày giao dịch cuối ── */}
          <DateFilterBlock
            label="Giao dịch cuối"
            dateMode={lastTxDateMode}
            setDateMode={setLastTxDateMode}
            selectedPreset={lastTxPreset}
            setSelectedPreset={setLastTxPreset}
            fromDate={lastTxFromDate}
            setFromDate={setLastTxFromDate}
            toDate={lastTxToDate}
            setToDate={setLastTxToDate}
            showPresetPanel={showLastTxPresetPanel}
            setShowPresetPanel={setShowLastTxPresetPanel}
            panelAnchorRect={lastTxPanelAnchorRect}
            setPanelAnchorRect={setLastTxPanelAnchorRect}
            openCal={openLastTxCal}
            setOpenCal={setOpenLastTxCal}
            presetRowRef={lastTxPresetRowRef}
            customDateRef={lastTxCustomDateRef}
          />

          {/* ── Loại khách hàng ── */}
          {/* <StatusButtons
            label="Loại khách hàng"
            options={[
              { value: "all", label: "Tất cả" },
              { value: "individual", label: "Cá nhân" },
              { value: "company", label: "Công ty" },
            ]}
            value={customerType}
            onChange={setCustomerType}
          /> */}

          {/* <div className="border-t border-gray-100" /> */}

          {/* ── Giới tính ── */}
          {/* <StatusButtons
            label="Giới tính"
            options={[
              { value: "all", label: "Tất cả" },
              { value: "male", label: "Nam" },
              { value: "female", label: "Nữ" },
            ]}
            value={gender}
            onChange={setGender}
          /> */}

          <div className="border-t border-gray-100" />

          {/* ── Tổng bán ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Tổng bán
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
                value={totalPurchasedFrom ?? ""}
                onChange={(e) =>
                  setTotalPurchasedFrom(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
              <input
                type="number"
                placeholder="Đến"
                className="w-1/2 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                value={totalPurchasedTo ?? ""}
                onChange={(e) =>
                  setTotalPurchasedTo(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Công nợ ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Công nợ
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
                  setDebtFrom(
                    e.target.value ? Number(e.target.value) : undefined
                  )
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

          {/* ── Điểm ── */}
          {/* <RangeInput
            label="Điểm thưởng"
            fromValue={pointFrom}
            toValue={pointTo}
            onFromChange={setPointFrom}
            onToChange={setPointTo}
          />

          <div className="border-t border-gray-100" /> */}

          {/* ── Trạng thái ── */}
          <StatusButtons
            label="Trạng thái"
            options={[
              { value: "true", label: "Hoạt động" },
              { value: "false", label: "Ngừng HĐ" },
              { value: "all", label: "Tất cả" },
            ]}
            value={isActive}
            onChange={setIsActive}
          />
        </div>
      </aside>

      <CustomerGroupForm
        isOpen={showGroupForm}
        onClose={() => {
          setShowGroupForm(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />
    </>
  );
}
