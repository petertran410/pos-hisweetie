// components/return-orders/ReturnOrdersSidebar.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useBranchStore } from "@/lib/store/branch";
import {
  ChevronDown,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

interface ReturnOrdersSidebarProps {
  onFiltersChange: (filters: any) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const RETURN_STATUS_OPTIONS = [
  {
    value: "1",
    label: "Yêu cầu trả hàng",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  {
    value: "6",
    label: "Đang nhập hàng (tạm)",
    color: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  {
    value: "2",
    label: "Nhập hàng trả",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  {
    value: "3",
    label: "Yêu cầu hoàn tiền",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  {
    value: "4",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "5",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
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

const getDateRangeFromPreset = (preset: string): { from: Date; to: Date } => {
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
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), q * 3, 1),
        to: new Date(now.getFullYear(), q * 3 + 3, 0),
      };
    }
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const lq = q === 0 ? 3 : q - 1;
      const ly = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return { from: new Date(ly, lq * 3, 1), to: new Date(ly, lq * 3 + 3, 0) };
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

// ── StatusDropdown ────────────────────────────────────────────────────────────
interface StatusOption {
  value: string;
  label: string;
  color: string;
  dot: string;
}

function StatusDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: StatusOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        }`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`}
              />
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${selected.color}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                value === opt.value ? "bg-brand-soft" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
              />
              <span
                className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SimpleDropdown ────────────────────────────────────────────────────────────
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
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        }`}>
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              {opt.label}
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PresetPanel (portal) ──────────────────────────────────────────────────────
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

// ── MiniCalendar ──────────────────────────────────────────────────────────────
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
              className={`aspect-square flex items-center justify-center rounded-lg text-xs transition-colors ${
                isSel
                  ? "bg-brand text-white font-semibold"
                  : isToday
                    ? "bg-brand-soft text-brand font-semibold"
                    : isDisabled
                      ? "text-gray-200 cursor-not-allowed"
                      : "hover:bg-gray-100 text-gray-700"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ReturnOrdersSidebar({
  onFiltersChange,
}: ReturnOrdersSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();

  const [branchId, setBranchId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [creatorId, setCreatorId] = useState<string>("");
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>("all_time");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  // Sync chi nhánh từ global store
  useEffect(() => {
    if (selectedBranch) setBranchId(selectedBranch.id.toString());
  }, [selectedBranch]);

  // Đóng calendar khi click ngoài
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

  // Debounce 300ms → giảm API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (selectedStatus) f.status = parseInt(selectedStatus);
      if (creatorId) f.createdBy = parseInt(creatorId);

      // Chỉ gửi date khi không phải all_time, hoặc khi đang ở custom mode
      if (selectedPreset !== "all_time" || dateMode === "custom") {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? { from: new Date(fromDate), to: new Date(toDate) }
              : getDateRangeFromPreset("this_month");
        f.fromDate = range.from.toISOString();
        f.toDate = range.to.toISOString();
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    selectedStatus,
    creatorId,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchId) n++;
    if (selectedStatus) n++;
    if (creatorId) n++;
    return n;
  }, [branchId, selectedStatus, creatorId]);

  const clearAll = () => {
    setBranchId("");
    setSelectedStatus("");
    setCreatorId("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh xử lý
          </label>
          <SimpleDropdown
            options={
              branches?.map((b) => ({ value: String(b.id), label: b.name })) ??
              []
            }
            value={branchId}
            placeholder="Tất cả chi nhánh"
            onChange={setBranchId}
          />
        </div>

        {/* ── Thời gian ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Thời gian
            </label>
          </div>

          <div className="space-y-1.5">
            {/* Row Preset — radio dot + ChevronRight */}
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
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  showPresetPanel ? "text-brand" : "text-gray-400"
                }`}
              />
            </div>

            {/* Row Tùy chỉnh — radio dot + Calendar icon */}
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

            {/* Custom date fields — tách riêng NGOÀI row click handler */}
            {dateMode === "custom" && (
              <div ref={customDateRef} className="space-y-2 pt-1">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const label = isFrom ? "Từ ngày" : "Đến ngày";
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;
                  return (
                    <div key={field}>
                      <span className="text-xs text-gray-500 mb-1 block">
                        {label}
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
          </div>

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

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <StatusDropdown
            options={RETURN_STATUS_OPTIONS}
            value={selectedStatus}
            placeholder="Tất cả trạng thái"
            onChange={setSelectedStatus}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người tạo
          </label>
          <SimpleDropdown
            options={
              users?.map((u: any) => ({
                value: String(u.id),
                label: u.name,
              })) ?? []
            }
            value={creatorId}
            placeholder="Tất cả"
            onChange={setCreatorId}
          />
        </div>
      </div>
    </aside>
  );
}
