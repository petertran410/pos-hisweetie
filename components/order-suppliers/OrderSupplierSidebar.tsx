"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";
import {
  ORDER_SUPPLIER_STATUS,
  getStatusLabel,
} from "@/lib/types/order-supplier";

interface OrderSupplierSidebarProps {
  filters: OrderSupplierFilters;
  setFilters: (filters: Partial<OrderSupplierFilters>) => void;
}

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    value: String(ORDER_SUPPLIER_STATUS.DRAFT),
    label: getStatusLabel(ORDER_SUPPLIER_STATUS.DRAFT),
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: String(ORDER_SUPPLIER_STATUS.CONFIRMED),
    label: getStatusLabel(ORDER_SUPPLIER_STATUS.CONFIRMED),
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  {
    value: String(ORDER_SUPPLIER_STATUS.PARTIAL),
    label: getStatusLabel(ORDER_SUPPLIER_STATUS.PARTIAL),
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
  {
    value: String(ORDER_SUPPLIER_STATUS.COMPLETED),
    label: getStatusLabel(ORDER_SUPPLIER_STATUS.COMPLETED),
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: String(ORDER_SUPPLIER_STATUS.CANCELLED),
    label: getStatusLabel(ORDER_SUPPLIER_STATUS.CANCELLED),
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

// ─── Preset groups ────────────────────────────────────────────────────────────
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

const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
      const s = new Date(now.getFullYear(), (q - 1) * 3, 1);
      const e = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
      return { from: s, to: e };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
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

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = startOffset + daysInMonth;
  const totalCells = Math.ceil(cells / 7) * 7;

  return (
    <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11);
              setViewYear((y) => y - 1);
            } else {
              setViewMonth((m) => m - 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">
          Tháng {viewMonth + 1}/{viewYear}
        </span>
        <button
          type="button"
          onClick={() => {
            if (viewMonth === 11) {
              setViewMonth(0);
              setViewYear((y) => y + 1);
            } else {
              setViewMonth((m) => m + 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-gray-400 font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            return <div key={i} />;
          }
          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const cellDate = new Date(viewYear, viewMonth, dayNum);
          const isSel = ds === value;
          const isToday = cellDate.getTime() === todayObj.getTime();
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
                  ? "bg-blue-600 text-white font-bold"
                  : isToday
                    ? "border border-blue-400 text-blue-600 font-semibold hover:bg-blue-50"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-blue-50 cursor-pointer",
              ].join(" ")}>
              {dayNum}
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      )
        onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect) return null;

  const left = anchorRect.right + 8;
  const top = anchorRect.top;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex gap-5">
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
                  ? "bg-blue-600 text-white border-blue-600 font-medium"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
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

// ─── StatusDropdown ───────────────────────────────────────────────────────────
function StatusMultiDropdown({
  options,
  values,
  onChange,
}: {
  options: typeof STATUS_OPTIONS;
  values: string[];
  onChange: (v: string[]) => void;
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

  const toggle = (val: string) => {
    const next = values.includes(val)
      ? values.filter((v) => v !== val)
      : [...values, val];
    onChange(next);
  };

  const selectedOptions = options.filter((o) => values.includes(o.value));

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none min-h-[34px] ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">Tất cả trạng thái</span>
          ) : (
            selectedOptions.map((o) => (
              <span
                key={o.value}
                className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${o.color}`}>
                {o.label}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                  checked ? "bg-blue-50" : "hover:bg-gray-50"
                } border-t border-gray-50 first:border-t-0`}>
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                />
                <span
                  className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
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
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
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
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
              !value
                ? "bg-blue-50 text-blue-700 font-medium"
                : "hover:bg-gray-50 text-gray-500"
            }`}>
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5 text-blue-500" />}
          </button>
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                value === opt.value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx >= 0 ? "border-t border-gray-50" : ""}`}>
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
export function OrderSupplierSidebar({
  filters,
  setFilters,
}: OrderSupplierSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { selectedBranch } = useBranchStore();

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  // Local string state cho các SimpleDropdown.
  // Mặc định bám theo chi nhánh đang chọn ở DashboardHeader.
  const [branchValue, setBranchValue] = useState(
    filters.branchId
      ? String(filters.branchId)
      : selectedBranch
        ? String(selectedBranch.id)
        : ""
  );
  const [statusValues, setStatusValues] = useState<string[]>(
    filters.status?.map(String) ?? []
  );
  const [createdByValue, setCreatedByValue] = useState(
    filters.createdById ? String(filters.createdById) : ""
  );
  const [userValue, setUserValue] = useState(
    filters.userId ? String(filters.userId) : ""
  );

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

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

  // Đẩy chi nhánh mặc định (theo header) lên filters ngay khi mount, để danh
  // sách lọc đúng chi nhánh đang chọn mà không cần user thao tác.
  useEffect(() => {
    if (selectedBranch && filters.branchId === undefined && branchValue) {
      setFilters({ branchId: Number(branchValue) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh ở header
  // thì cập nhật bộ lọc theo chi nhánh đó. Skip lần mount đầu.
  const isFirstBranchSyncRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const cur = selectedBranch?.id ?? null;
    if (isFirstBranchSyncRef.current) {
      isFirstBranchSyncRef.current = false;
      lastSyncedBranchIdRef.current = cur;
      return;
    }
    if (cur !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = cur;
      setBranchValue(cur ? String(cur) : "");
      setFilters({ branchId: cur ?? undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch?.id]);
  const applyPreset = (preset: string) => {
    const range = getDateRangeFromPreset(preset);
    if (!range) {
      setFilters({ createdDateFrom: undefined, createdDateTo: undefined });
    } else {
      setFilters({
        createdDateFrom: range.from.toISOString(),
        createdDateTo: range.to.toISOString(),
      });
    }
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchValue) n++;
    if (statusValues.length > 0) n++;
    if (createdByValue) n++;
    if (userValue) n++;
    if (dateMode === "custom" && fromDate && toDate) n++;
    if (dateMode === "preset" && selectedPreset !== "all_time") n++;
    return n;
  }, [
    branchValue,
    statusValues,
    createdByValue,
    userValue,
    dateMode,
    fromDate,
    toDate,
    selectedPreset,
  ]);

  const resetFilters = () => {
    const headerBranchId = selectedBranch?.id;
    setBranchValue(headerBranchId ? String(headerBranchId) : "");
    setStatusValues([]);
    setCreatedByValue("");
    setUserValue("");
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setFilters({
      branchId: headerBranchId ?? undefined,
      status: undefined,
      createdById: undefined,
      userId: undefined,
      createdDateFrom: undefined,
      createdDateTo: undefined,
    });
    // Re-apply this_month default
    const range = getDateRangeFromPreset("this_month")!;
    setFilters({
      createdDateFrom: range.from.toISOString(),
      createdDateTo: range.to.toISOString(),
    });
  };

  const branchOptions = useMemo<SimpleOption[]>(
    () =>
      branches
        ?.filter((b) => b.isActive)
        .map((b) => ({ value: String(b.id), label: b.name })) ?? [],
    [branches]
  );

  const userOptions = useMemo<SimpleOption[]>(
    () =>
      users?.map((u: any) => ({ value: String(u.id), label: u.name })) ?? [],
    [users]
  );

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
        {/* Thời gian */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Thời gian
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
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  dateMode === "preset" ? "border-blue-600" : "border-gray-300"
                }`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 ${
                  showPresetPanel ? "text-blue-500" : "text-gray-400"
                }`}
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
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  dateMode === "custom" ? "border-blue-600" : "border-gray-300"
                }`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
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
                  const label = isFrom ? "Từ ngày" : "Đến ngày";
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;

                  return (
                    <div key={field} className="relative">
                      <span className="text-xs text-gray-500 mb-1 block">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${
                          val
                            ? "border-blue-300 bg-blue-50 text-gray-800"
                            : "border-gray-200 text-gray-400"
                        } ${isOpen ? "ring-2 ring-blue-100 border-blue-400" : "hover:border-gray-300"}`}>
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
                          onChange={(v) => {
                            setVal(v);
                            // Apply khi đã có cả 2 ngày
                            const newFrom = isFrom ? v : fromDate;
                            const newTo = isFrom ? toDate : v;
                            if (newFrom && newTo) {
                              const from = new Date(newFrom + "T00:00:00");
                              const to = new Date(newTo + "T23:59:59");
                              setFilters({
                                createdDateFrom: from.toISOString(),
                                createdDateTo: to.toISOString(),
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

        {/* Trạng thái */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Trạng thái
          </label>
          <StatusMultiDropdown
            options={STATUS_OPTIONS}
            values={statusValues}
            onChange={(v) => {
              setStatusValues(v);
              setFilters({ status: v.length > 0 ? v.map(Number) : undefined });
            }}
          />
        </div>

        {/* Chi nhánh */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Chi nhánh
          </label>
          <SimpleDropdown
            options={branchOptions}
            value={branchValue}
            placeholder="Tất cả chi nhánh"
            onChange={(v) => {
              setBranchValue(v);
              setFilters({ branchId: v ? Number(v) : undefined });
            }}
          />
        </div>

        {/* Người tạo */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Người tạo
          </label>
          <SimpleDropdown
            options={userOptions}
            value={createdByValue}
            placeholder="Tất cả"
            onChange={(v) => {
              setCreatedByValue(v);
              setFilters({ createdById: v ? Number(v) : undefined });
            }}
          />
        </div>

        {/* Người nhận đặt */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Người nhận đặt
          </label>
          <SimpleDropdown
            options={userOptions}
            value={userValue}
            placeholder="Tất cả"
            onChange={(v) => {
              setUserValue(v);
              setFilters({ userId: v ? Number(v) : undefined });
            }}
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
            applyPreset(v);
          }}
          onClose={() => setShowPresetPanel(false)}
          anchorRect={panelAnchorRect}
          triggerRef={presetRowRef}
        />
      )}
    </aside>
  );
}
