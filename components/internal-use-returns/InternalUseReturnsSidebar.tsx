"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { FilterMultiSelect } from "@/components/ui/filters";
import { normalizeRectForFixed } from "@/lib/utils/zoom";
import type { InternalUseReturnQuery } from "@/lib/api/internal-use-returns";

interface Props {
  filters: InternalUseReturnQuery;
  onFiltersChange: (filters: InternalUseReturnQuery) => void;
}

const STATUS_OPTIONS = [
  { value: "4", label: "Phiếu tạm", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "1", label: "Chờ nhận hàng", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "5", label: "Đang nhập hàng (tạm)", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { value: "2", label: "Đã nhập lại kho", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  { value: "3", label: "Đã hủy", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
];

const PRESET_GROUPS = [
  { label: "Tất cả", options: [{ label: "Toàn thời gian", value: "all_time" }] },
  { label: "Theo ngày", options: [{ label: "Hôm nay", value: "today" }, { label: "Hôm qua", value: "yesterday" }] },
  { label: "Theo tuần", options: [{ label: "Tuần này", value: "this_week" }, { label: "Tuần trước", value: "last_week" }, { label: "7 ngày qua", value: "last_7_days" }] },
  { label: "Theo tháng", options: [{ label: "Tháng này", value: "this_month" }, { label: "Tháng trước", value: "last_month" }, { label: "30 ngày qua", value: "last_30_days" }] },
  { label: "Theo quý", options: [{ label: "Quý này", value: "this_quarter" }, { label: "Quý trước", value: "last_quarter" }] },
  { label: "Theo năm", options: [{ label: "Năm nay", value: "this_year" }, { label: "Năm trước", value: "last_year" }] },
] as const;

const PRESET_LABELS = Object.fromEntries(
  PRESET_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.value, option.label])
  )
);

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

function getDateRange(preset: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const date = new Date(today.getTime() - 86400000);
      return { from: date, to: endOfDay(date) };
    }
    case "this_week": {
      const from = new Date(today);
      from.setDate(today.getDate() - today.getDay() + 1);
      return { from, to: now };
    }
    case "last_week": {
      const from = new Date(today);
      from.setDate(today.getDate() - today.getDay() - 6);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      return { from, to: endOfDay(to) };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: endOfDay(new Date(now.getFullYear(), quarter * 3 + 3, 0)),
      };
    }
    case "last_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return {
        from: new Date(year, lastQuarter * 3, 1),
        to: endOfDay(new Date(year, lastQuarter * 3 + 3, 0)),
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

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = STATUS_OPTIONS.find((option) => option.value === value);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-sm transition-colors ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
              <span className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${selected.color}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Tất cả trạng thái</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value === value ? "" : option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 border-b border-gray-50 px-3 py-2.5 text-left text-sm last:border-0 ${
                option.value === value ? "bg-brand-soft" : "hover:bg-gray-50"
              }`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
              <span className={`flex-1 rounded-full px-2 py-0.5 text-xs font-medium ${option.color}`}>
                {option.label}
              </span>
              {option.value === value && <Check className="h-3.5 w-3.5 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniCalendar({
  value,
  onChange,
  onClose,
  minDate,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const today = new Date();
  const initial = value ? new Date(`${value}T00:00:00`) : today;
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const formatDate = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1))}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1))}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((day) => (
          <div key={day} className="py-0.5 text-center text-[10px] font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, index) => {
          if (!day) return <div key={index} className="aspect-square" />;
          const date = formatDate(day);
          const disabled = minDate ? date < minDate : false;
          const selected = date === value;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(date);
                onClose();
              }}
              className={`aspect-square rounded-lg text-xs ${
                selected
                  ? "bg-brand font-semibold text-white"
                  : isToday
                    ? "bg-brand-soft font-semibold text-brand"
                    : disabled
                      ? "cursor-not-allowed text-gray-200"
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

function PresetPanel({
  selected,
  anchorRect,
  triggerRef,
  onSelect,
  onClose,
}: {
  selected: string;
  anchorRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        !ref.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof window === "undefined") return null;
  const rect = normalizeRectForFixed(anchorRect);
  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: rect.top, left: rect.right + 8, zIndex: 9999 }}
      className="flex gap-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="flex min-w-[88px] flex-col gap-1.5">
          <span className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {group.label}
          </span>
          {group.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-left text-sm ${
                selected === option.value
                  ? "border-brand bg-brand font-medium text-white"
                  : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
              }`}>
              {option.label}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

export function InternalUseReturnsSidebar({ filters, onFiltersChange }: Props) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchIds, setBranchIds] = useState<number[]>(
    filters.branchIds || (filters.branchId ? [filters.branchId] : selectedBranch?.id ? [selectedBranch.id] : [])
  );
  const [selectedStatus, setSelectedStatus] = useState(
    filters.status ? String(filters.status) : ""
  );
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [openCalendar, setOpenCalendar] = useState<"from" | "to" | null>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next: InternalUseReturnQuery = {
        search: filters.search,
        branchIds: branchIds.length ? branchIds : undefined,
        status: selectedStatus ? Number(selectedStatus) : undefined,
      };
      if (dateMode === "custom") {
        if (fromDate) next.fromDate = new Date(`${fromDate}T00:00:00`).toISOString();
        if (toDate) next.toDate = new Date(`${toDate}T23:59:59.999`).toISOString();
      } else if (selectedPreset !== "all_time") {
        const range = getDateRange(selectedPreset);
        if (range) {
          next.fromDate = range.from.toISOString();
          next.toDate = range.to.toISOString();
        }
      }
      onFiltersChange(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchIds,
    dateMode,
    filters.search,
    fromDate,
    onFiltersChange,
    selectedPreset,
    selectedStatus,
    toDate,
  ]);

  useEffect(() => {
    if (!openCalendar) return;
    const handler = (event: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(event.target as Node)) {
        setOpenCalendar(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openCalendar]);

  const activeFilterCount = useMemo(
    () =>
      Number(branchIds.length > 0) +
      Number(!!selectedStatus) +
      Number(selectedPreset !== "all_time" || dateMode === "custom"),
    [branchIds.length, dateMode, selectedPreset, selectedStatus]
  );

  const clearAll = () => {
    setBranchIds([]);
    setSelectedStatus("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    onFiltersChange({ search: filters.search });
  };

  return (
    <aside className="custom-sidebar-scroll m-4 flex w-64 shrink-0 flex-col rounded-xl border bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b bg-white px-4 py-2">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-sm font-medium text-brand hover:text-brand-dark">
            Xóa tất cả
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Chi nhánh xử lý</label>
          <FilterMultiSelect
            options={branches?.map((branch) => ({ value: String(branch.id), label: branch.name })) ?? []}
            values={branchIds.map(String)}
            onChange={(values) => setBranchIds(values.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(count) => `${count} chi nhánh`}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Thời gian tạo</label>
          <div className="space-y-1.5">
            <div
              ref={presetRef}
              onClick={() => {
                setDateMode("preset");
                setOpenCalendar(null);
                if (showPresetPanel) setShowPresetPanel(false);
                else {
                  setAnchorRect(presetRef.current?.getBoundingClientRect() || null);
                  setShowPresetPanel(true);
                }
              }}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1 ${
                dateMode === "preset" ? "border-brand bg-brand-soft" : "border-gray-200 hover:border-gray-300"
              }`}>
              <span className={`flex h-3 w-3 items-center justify-center rounded-full border-2 ${dateMode === "preset" ? "border-brand" : "border-gray-300"}`}>
                {dateMode === "preset" && <span className="h-1 w-1 rounded-full bg-brand" />}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-700">
                {PRESET_LABELS[selectedPreset] || "Chọn thời gian"}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1 ${
                dateMode === "custom" ? "border-brand bg-brand-soft" : "border-gray-200 hover:border-gray-300"
              }`}>
              <span className={`flex h-3 w-3 items-center justify-center rounded-full border-2 ${dateMode === "custom" ? "border-brand" : "border-gray-300"}`}>
                {dateMode === "custom" && <span className="h-1 w-1 rounded-full bg-brand" />}
              </span>
              <span className="flex-1 text-sm text-gray-700">Tùy chỉnh</span>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            {dateMode === "custom" && (
              <div ref={customRef} className="space-y-2 pt-1">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const value = isFrom ? fromDate : toDate;
                  return (
                    <div key={field}>
                      <span className="mb-1 block text-xs text-gray-500">{isFrom ? "Từ ngày" : "Đến ngày"}</span>
                      <button
                        type="button"
                        onClick={() => setOpenCalendar(openCalendar === field ? null : field)}
                        className={`flex w-full items-center justify-between rounded-lg border px-2 py-1 text-sm ${
                          value ? "border-brand bg-brand-soft text-gray-800" : "border-gray-200 text-gray-400"
                        }`}>
                        <span>{value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "Chọn ngày"}</span>
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </button>
                      {openCalendar === field && (
                        <MiniCalendar
                          value={value}
                          onChange={isFrom ? setFromDate : setToDate}
                          onClose={() => setOpenCalendar(null)}
                          minDate={!isFrom ? fromDate || undefined : undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {showPresetPanel && (
            <PresetPanel
              selected={selectedPreset}
              anchorRect={anchorRect}
              triggerRef={presetRef}
              onSelect={setSelectedPreset}
              onClose={() => setShowPresetPanel(false)}
            />
          )}
        </div>

        <div className="border-t border-gray-100" />
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Trạng thái</label>
          <StatusDropdown value={selectedStatus} onChange={setSelectedStatus} />
        </div>
      </div>
    </aside>
  );
}
