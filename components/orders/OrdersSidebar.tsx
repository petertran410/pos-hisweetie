// components/orders/OrdersSidebar.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";
import {
  ChevronDown,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useBranchStore } from "@/lib/store/branch";

interface OrdersSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Phiếu tạm",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "confirmed",
    label: "Đã xác nhận",
    color: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    value: "partially_invoiced",
    label: "Ra 1 phần HĐ",
    color: "bg-teal-100 text-teal-600",
    dot: "bg-teal-300",
  },
  {
    value: "completed",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "unpaid",
    label: "Chưa thanh toán",
    color: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
  {
    value: "partial",
    label: "Thanh toán 1 phần",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
  {
    value: "paid",
    label: "Đã thanh toán",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
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

// Flat map để lookup label nhanh
const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);

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
      return { from: s, to: e };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
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
      return { from: today, to: now };
  }
};

// ── Reusable custom dropdown ──────────────────────────────────────────────────
interface DropdownOption {
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
  options: DropdownOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      {/* Đổi <button> → <div> để tránh nested button (X clear button bên trong) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
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
            // Đây là button thật duy nhất — không còn lồng trong button nữa
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

function MultiStatusDropdown({
  options,
  values,
  placeholder,
  onChange,
}: {
  options: DropdownOption[];
  values: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
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

  const selectedOptions = options.filter((o) => values.includes(o.value));

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((s) => (
              <span
                key={s.value}
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${s.color}`}>
                {s.label}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
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
          {options.map((opt, idx) => {
            const isSelected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(
                    isSelected
                      ? values.filter((v) => v !== opt.value)
                      : [...values, opt.value]
                  );
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                />
                <span
                  className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
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

      {open && options.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value === value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              {opt.label}
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SearchableMultiDropdown (multi-select + ô tìm theo tên) ─────────────────
function SearchableMultiDropdown({
  options,
  values,
  placeholder,
  searchPlaceholder,
  onChange,
}: {
  options: SimpleOption[];
  values: string[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (open) inputRef.current?.focus();
  }, [open]);

  const selectedOptions = options.filter((o) => values.includes(o.value));
  const label =
    selectedOptions.length === 0
      ? null
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} đã chọn`;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

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
        <span className={label ? "text-gray-800 truncate" : "text-gray-400"}>
          {label ?? placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
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
              placeholder={searchPlaceholder ?? "Tìm theo tên..."}
              className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-gray-400 text-center">
                Không tìm thấy
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = values.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(
                        isSelected
                          ? values.filter((v) => v !== opt.value)
                          : [...values, opt.value]
                      );
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
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
      // Exclude cả panel lẫn trigger khỏi close-outside
      const insidePanel = ref.current?.contains(e.target as Node);
      const insideTrigger = triggerRef.current?.contains(e.target as Node);
      if (!insidePanel && !insideTrigger) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof window === "undefined") return null;

  // Cạnh phải sidebar + 8px gap; nếu tràn màn hình thì flip trái
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
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm select-none">
      {/* Header */}
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

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
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

      {/* Footer */}
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
// ─────────────────────────────────────────────────────────────────────────────

export function OrdersSidebar({ onFiltersChange }: OrdersSidebarProps) {
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b: any) => b.isActive),
    [branches]
  );
  const { data: customersData } = useCustomers();
  const { data: users } = useUsersForFilter();
  const { data: saleChannels } = useSaleChannels();
  const { data: bankAccounts } = useBankAccountsForPayment();
  const { selectedBranch } = useBranchStore();

  // Restore filter state từ localStorage
  const STORAGE_KEY = "orders-sidebar-filters";
  const getSavedFilters = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saved = useRef(getSavedFilters());

  const [paymentMethod, setPaymentMethod] = useState<"" | "cash" | "transfer">(
    saved.current?.paymentMethod || ""
  );
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<
    number[]
  >(saved.current?.selectedBankAccountIds || []);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(() => {
    const savedIds = saved.current?.selectedBranchIds;
    if (Array.isArray(savedIds)) {
      // Giữ nguyên filter nhiều chi nhánh (>=2) user đã chủ động chọn.
      if (savedIds.length >= 2) return savedIds;
      // Giữ nguyên lựa chọn "Tất cả chi nhánh" (mảng rỗng) user đã chủ động chọn.
      if (savedIds.length === 0) return [];
    }
    // Còn lại (1 chi nhánh hoặc chưa có gì): bám theo chi nhánh đang chọn ở
    // DashboardHeader. Quan trọng vì khi đổi chi nhánh ở header, guard
    // unmount→mount lại sidebar, nên không thể dựa vào localStorage cũ.
    if (selectedBranch) return [selectedBranch.id];
    return Array.isArray(savedIds) ? savedIds : [];
  });
  const [customerId, setCustomerId] = useState(saved.current?.customerId || "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    saved.current?.selectedStatuses || []
  );
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(
    saved.current?.selectedPaymentStatus || ""
  );
  const [enableOrderDate, setEnableOrderDate] = useState(
    saved.current?.enableOrderDate ?? false
  );
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    saved.current?.dateMode || "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState(
    saved.current?.selectedPreset || "all_time"
  );
  const [fromDate, setFromDate] = useState(saved.current?.fromDate || "");
  const [toDate, setToDate] = useState(saved.current?.toDate || "");
  const [creatorIds, setCreatorIds] = useState<string[]>(
    saved.current?.creatorIds || []
  );
  const [soldByIds, setSoldByIds] = useState<string[]>(
    saved.current?.soldByIds || []
  );
  const [saleChannelId, setSaleChannelId] = useState(
    saved.current?.saleChannelId || ""
  );
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);

  const customDateRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Persist filter state vào localStorage khi thay đổi
  useEffect(() => {
    const state = {
      selectedBranchIds,
      customerId,
      selectedStatuses,
      selectedPaymentStatus,
      enableOrderDate,
      dateMode,
      selectedPreset,
      fromDate,
      toDate,
      creatorIds,
      soldByIds,
      saleChannelId,
      paymentMethod,
      selectedBankAccountIds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedPaymentStatus,
    enableOrderDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorIds,
    soldByIds,
    saleChannelId,
    paymentMethod,
    selectedBankAccountIds,
  ]);

  const customers = useMemo(() => customersData?.data || [], [customersData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId]
  );

  // Local search + slice(50) → tránh render 1000 DOM nodes
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactNumber ?? "").includes(q) ||
          (c.code ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [customers, customerSearch]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (customerId) n++;
    if (selectedStatuses.length > 0) n++;
    if (selectedPaymentStatus) n++;
    if (enableOrderDate) n++;
    if (creatorIds.length > 0) n++;
    if (soldByIds.length > 0) n++;
    if (saleChannelId) n++;
    if (paymentMethod) n++;
    return n;
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedPaymentStatus,
    enableOrderDate,
    creatorIds,
    soldByIds,
    saleChannelId,
  ]);

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

  // Debounce 300ms qua cleanup pattern
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (selectedBranchIds.length > 0) f.branchIds = selectedBranchIds;
      if (customerId) f.customerId = parseInt(customerId);
      if (selectedStatuses.length > 0) f.statuses = selectedStatuses;
      if (selectedPaymentStatus) f.paymentStatus = selectedPaymentStatus;
      if (creatorIds.length > 0) f.createdByIds = creatorIds.map(Number);
      if (soldByIds.length > 0) f.soldByIds = soldByIds.map(Number);
      if (saleChannelId) f.saleChannelId = parseInt(saleChannelId);
      if (selectedPreset !== "all_time" || dateMode === "custom") {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? { from: new Date(fromDate), to: new Date(toDate) }
              : getDateRangeFromPreset("this_month");
        f.fromCreatedDate = range.from.toISOString();
        f.toCreatedDate = range.to.toISOString();
      }
      if (paymentMethod) f.paymentMethod = paymentMethod;
      if (paymentMethod === "transfer" && selectedBankAccountIds.length > 0)
        f.bankAccountIds = selectedBankAccountIds;

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedPaymentStatus,
    enableOrderDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorIds,
    soldByIds,
    saleChannelId,
    paymentMethod,
    selectedBankAccountIds,
  ]);

  const clearAll = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setCustomerId("");
    setCustomerSearch("");
    setSelectedStatuses([]);
    setSelectedPaymentStatus("");
    setEnableOrderDate(true);
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    setCreatorIds([]);
    setSoldByIds([]);
    setSaleChannelId("");
    onFiltersChange({});
    setPaymentMethod("");
    setSelectedBankAccountIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh, tick lại chi nhánh đó.
  // - Skip lần mount đầu tiên (hydrate) để không ghi đè localStorage đã restore.
  // - Chỉ ghi đè khi sidebar đang ở chế độ "bám theo header" (đúng 1 chi nhánh).
  //   Nếu user đang lọc nhiều chi nhánh (>=2) hoặc "Tất cả chi nhánh" (rỗng) thì
  //   giữ nguyên, không ghi đè bằng chi nhánh mới chọn trên header.
  const isFirstRenderRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const currentBranchId = selectedBranch?.id ?? null;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastSyncedBranchIdRef.current = currentBranchId;
      return;
    }
    if (currentBranchId !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = currentBranchId;
      setSelectedBranchIds((prev) =>
        prev.length === 1 ? (currentBranchId ? [currentBranchId] : []) : prev
      );
    }
  }, [selectedBranch?.id]);

  function BranchMultiSelectDropdown({
    branches,
    selectedIds,
    onChange,
  }: {
    branches: { id: number; name: string }[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
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

    const toggle = (id: number) => {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id]
      );
    };

    const label =
      selectedIds.length === 0
        ? null
        : selectedIds.length === 1
          ? (branches.find((b) => b.id === selectedIds[0])?.name ?? "")
          : `${selectedIds.length} chi nhánh`;

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
          <span className={label ? "text-gray-800 truncate" : "text-gray-400"}>
            {label ?? "Tất cả chi nhánh"}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
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
            {branches.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  selectedIds.includes(b.id) ? "bg-blue-50" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(b.id)}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                />
                <span className="text-gray-700">{b.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Thời gian ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Thời gian
            </label>
          </div>

          <div className="space-y-1.5">
            {/* ── Row: Preset (radio) ── */}
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
              {/* Radio dot */}
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
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
                className={`w-4 h-4 transition-colors flex-shrink-0 ${
                  showPresetPanel ? "text-blue-500" : "text-gray-400"
                }`}
              />
            </div>

            {/* ── Row: Tùy chỉnh (radio) ── */}
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
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  dateMode === "custom" ? "border-blue-600" : "border-gray-300"
                }`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">Tùy chỉnh</span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>

            {/* ── Custom date fields + MiniCalendar ── */}
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

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <BranchMultiSelectDropdown
            branches={activeBranches}
            selectedIds={selectedBranchIds}
            onChange={setSelectedBranchIds}
          />
        </div>

        {/* ── Trạng thái đơn hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái đơn hàng
          </label>
          <MultiStatusDropdown
            options={STATUS_OPTIONS}
            values={selectedStatuses}
            placeholder="Chọn trạng thái"
            onChange={setSelectedStatuses}
          />
        </div>

        {/* ── Trạng thái thanh toán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái thanh toán
          </label>
          <StatusDropdown
            options={PAYMENT_STATUS_OPTIONS}
            value={selectedPaymentStatus}
            placeholder="Chọn trạng thái TT"
            onChange={setSelectedPaymentStatus}
          />
        </div>

        {/* ── Phương thức thanh toán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phương thức thanh toán
          </label>

          <SimpleDropdown
            options={[
              { value: "cash", label: "Tiền mặt" },
              { value: "transfer", label: "Ngân hàng" },
            ]}
            value={paymentMethod}
            placeholder="Tất cả"
            onChange={(v) => {
              setPaymentMethod(v as "" | "cash" | "transfer");
              setSelectedBankAccountIds([]);
            }}
          />

          {/* Bank account multi-select — chỉ hiện khi chọn Ngân hàng */}
          {paymentMethod === "transfer" && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
              {/* Chọn tất cả */}
              <label className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(bankAccounts) &&
                    bankAccounts.length > 0 &&
                    selectedBankAccountIds.length === bankAccounts.length
                  }
                  onChange={(e) => {
                    if (!Array.isArray(bankAccounts)) return;
                    setSelectedBankAccountIds(
                      e.target.checked ? bankAccounts.map((a: any) => a.id) : []
                    );
                  }}
                  className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs font-medium text-gray-600">
                  Tất cả tài khoản
                </span>
              </label>

              {/* Danh sách tài khoản */}
              <div className="max-h-40 overflow-y-auto">
                {!Array.isArray(bankAccounts) || bankAccounts.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400 text-center">
                    Không có tài khoản
                  </div>
                ) : (
                  bankAccounts.map((acc: any) => (
                    <label
                      key={acc.id}
                      className="flex items-center gap-2.5 px-3 py-2 border-t border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={selectedBankAccountIds.includes(acc.id)}
                        onChange={(e) =>
                          setSelectedBankAccountIds((prev) =>
                            e.target.checked
                              ? [...prev, acc.id]
                              : prev.filter((id) => id !== acc.id)
                          )
                        }
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">
                          {acc.bankCode} · {acc.accountNumber}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {acc.accountHolder}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người tạo
          </label>
          <SearchableMultiDropdown
            options={
              users?.map((u: any) => ({
                value: String(u.id),
                label: u.name,
              })) ?? []
            }
            values={creatorIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm theo tên người tạo..."
            onChange={setCreatorIds}
          />
        </div>

        {/* ── Người bán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người bán
          </label>
          <SearchableMultiDropdown
            options={
              users?.map((u: any) => ({
                value: String(u.id),
                label: u.name,
              })) ?? []
            }
            values={soldByIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm theo tên người bán..."
            onChange={setSoldByIds}
          />
        </div>

        {/* ── Kênh bán ── */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kênh bán hàng
          </label>
          <SimpleDropdown
            options={
              saleChannels?.map((sc) => ({
                value: String(sc.id),
                label: sc.name,
              })) ?? []
            }
            value={saleChannelId}
            placeholder="Tất cả kênh"
            onChange={setSaleChannelId}
          />
        </div> */}
      </div>
    </aside>
  );
}
