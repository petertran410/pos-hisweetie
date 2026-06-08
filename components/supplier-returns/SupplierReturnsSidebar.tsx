"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSuppliers } from "@/lib/hooks/useSuppliers";

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

const STATUS_OPTIONS = [
  {
    value: "1",
    label: "Yêu cầu trả",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "2",
    label: "Đã xuất kho",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "3",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "4",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
  {
    value: "5",
    label: "Phiếu tạm",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
];

const MODE_OPTIONS = [
  {
    value: "by_purchase_order",
    label: "Theo phiếu nhập",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "by_product",
    label: "Sản phẩm lẻ",
    color: "bg-purple-100 text-purple-700",
    dot: "bg-purple-400",
  },
];

// ─── getDateRangeFromPreset ───────────────────────────────────────────────────

const getDateRangeFromPreset = (preset: string): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { from: y, to: new Date(y.getTime() + 86399999) };
    }
    case "this_week": {
      const d = new Date(today);
      d.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: d, to: now };
    }
    case "last_week": {
      const d = new Date(today);
      d.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
      const e = new Date(d);
      e.setDate(d.getDate() + 6);
      return { from: d, to: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999) };
    }
    case "last_7_days": {
      const d = new Date(today);
      d.setDate(today.getDate() - 6);
      return { from: d, to: now };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case "last_30_days": {
      const d = new Date(today);
      d.setDate(today.getDate() - 29);
      return { from: d, to: now };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
    }
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const lq = q === 0 ? 3 : q - 1;
      const ly = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return { from: new Date(ly, lq * 3, 1), to: new Date(ly, lq * 3 + 3, 0, 23, 59, 59, 999) };
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

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        width: anchorRect.width,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      <div className="max-h-72 overflow-y-auto p-2 space-y-1">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {group.label}
            </div>
            {group.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selected === opt.value
                    ? "bg-blue-600 text-white border-blue-600 font-medium shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </div>
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
            ? "border-blue-400 ring-2 ring-blue-100"
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
                value === opt.value ? "bg-blue-50" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
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
            ? "border-blue-400 ring-2 ring-blue-100"
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
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
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span>{opt.label}</span>
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

function SearchableDropdown({
  options,
  value,
  placeholder,
  searchPlaceholder,
  onChange,
}: {
  options: SimpleOption[];
  value: string;
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      ),
    [options, search]
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? "Tìm kiếm..."}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                Không tìm thấy
              </div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(value === opt.value ? "" : opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                    value === opt.value
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-700"
                  } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SupplierReturnsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

export function SupplierReturnsSidebar({
  onFiltersChange,
}: SupplierReturnsSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { data: suppliersData } = useSuppliers({
    isActive: true,
    pageSize: 200,
  });

  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (supplierId) f.supplierId = parseInt(supplierId);
      if (selectedStatus) f.status = parseInt(selectedStatus);
      if (selectedMode) f.mode = selectedMode;
      if (creatorId) f.createdBy = parseInt(creatorId);

      if (selectedPreset !== "all_time" || dateMode === "custom") {
        if (dateMode === "preset") {
          const range = getDateRangeFromPreset(selectedPreset);
          f.fromDate = range.from.toISOString();
          f.toDate = range.to.toISOString();
        } else {
          if (fromDate)
            f.fromDate = new Date(fromDate + "T00:00:00").toISOString();
          if (toDate) f.toDate = new Date(toDate + "T23:59:59").toISOString();
        }
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    supplierId,
    selectedStatus,
    selectedMode,
    creatorId,
    selectedPreset,
    fromDate,
    toDate,
    dateMode,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (supplierId) n++;
    if (selectedStatus) n++;
    if (selectedMode) n++;
    if (creatorId) n++;
    if (selectedPreset !== "all_time") n++;
    if (fromDate || toDate) n++;
    return n;
  }, [
    supplierId,
    selectedStatus,
    selectedMode,
    creatorId,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const resetFilters = () => {
    setSupplierId("");
    setSelectedStatus("");
    setSelectedMode("");
    setCreatorId("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
  };

  const supplierOptions: SimpleOption[] = useMemo(
    () =>
      suppliersData?.data?.map((s: any) => ({
        value: String(s.id),
        label: s.name,
      })) ?? [],
    [suppliersData]
  );

  const userOptions: SimpleOption[] = useMemo(
    () =>
      users?.map((u: any) => ({ value: String(u.id), label: u.name })) ?? [],
    [users]
  );

  const branchOptions: SimpleOption[] = useMemo(
    () =>
      branches
        ?.filter((b: any) => b.isActive)
        .map((b: any) => ({ value: String(b.id), label: b.name })) ?? [],
    [branches]
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
              className={`flex items-center justify-between px-2 py-1 border rounded-lg text-sm cursor-pointer transition-colors select-none ${
                dateMode === "preset"
                  ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                  : "hover:border-gray-300 text-gray-700"
              }`}>
              <span className="font-medium">
                {dateMode === "preset"
                  ? (PRESET_LABELS[selectedPreset] ?? selectedPreset)
                  : "Chọn nhanh"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${showPresetPanel ? "rotate-180" : ""}`}
              />
            </div>

            {/* Custom date row */}
            <div
              ref={customDateRef}
              className={`border rounded-lg overflow-hidden transition-colors ${
                dateMode === "custom"
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-gray-200"
              }`}>
              <button
                type="button"
                onClick={() => {
                  setDateMode("custom");
                  setSelectedPreset("all_time");
                  setShowPresetPanel(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                  dateMode === "custom"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}>
                <Calendar className="w-3.5 h-3.5" />
                Tùy chỉnh
              </button>

              {dateMode === "custom" && (
                <div className="px-2 pb-2 space-y-2 border-t border-gray-100">
                  {(["from", "to"] as const).map((field) => {
                    const val = field === "from" ? fromDate : toDate;
                    const label = field === "from" ? "Từ ngày" : "Đến ngày";
                    const setVal = field === "from" ? setFromDate : setToDate;
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
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <SimpleDropdown
            options={branchOptions}
            value={branchId}
            placeholder="Tất cả chi nhánh"
            onChange={setBranchId}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Nhà cung cấp ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhà cung cấp
          </label>
          <SearchableDropdown
            options={supplierOptions}
            value={supplierId}
            placeholder="Tất cả NCC"
            searchPlaceholder="Tìm tên nhà cung cấp..."
            onChange={setSupplierId}
          />
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

        {/* ── Loại trả ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại trả hàng
          </label>
          <StatusDropdown
            options={MODE_OPTIONS}
            value={selectedMode}
            placeholder="Tất cả loại"
            onChange={setSelectedMode}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người tạo
          </label>
          <SimpleDropdown
            options={userOptions}
            value={creatorId}
            placeholder="Tất cả"
            onChange={setCreatorId}
          />
        </div>
      </div>
    </aside>
  );
}
