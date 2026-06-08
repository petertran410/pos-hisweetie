"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

interface DestructionsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  {
    value: 1,
    label: "Phiếu tạm",
    color: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  {
    value: 2,
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: 3,
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const PRESET_GROUPS = [
  {
    label: "Hôm nay / Hôm qua",
    options: [
      { value: "today", label: "Hôm nay" },
      { value: "yesterday", label: "Hôm qua" },
    ],
  },
  {
    label: "Tuần",
    options: [
      { value: "this_week", label: "Tuần này" },
      { value: "last_week", label: "Tuần trước" },
    ],
  },
  {
    label: "Tháng",
    options: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
    ],
  },
  {
    label: "Khác",
    options: [
      { value: "last_7_days", label: "7 ngày qua" },
      { value: "last_30_days", label: "30 ngày qua" },
    ],
  },
];

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
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
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
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t))
        return;
      onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect) return null;
  const top = anchorRect.bottom + 6;
  const left = Math.max(8, anchorRect.right - 320);

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top, left, width: 320, zIndex: 1000 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl p-3 space-y-2">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-[11px] font-semibold text-gray-400 uppercase mb-1.5 px-1">
            {g.label}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {g.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors text-left ${
                  selected === opt.value
                    ? "bg-brand text-white border-brand font-medium shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
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
              className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${
                isSel
                  ? "bg-brand text-white font-semibold"
                  : isToday
                    ? "border border-brand text-brand font-medium hover:bg-brand-soft"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
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

// ─── SimpleDropdown (single select) ─────────────────────────────────────────
function SimpleDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
          value
            ? "border-brand bg-brand-soft text-gray-800"
            : "border-gray-200 text-gray-400"
        } ${open ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
        <span className="truncate">{selected?.label || label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
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
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function DestructionsSidebar({
  onFiltersChange,
}: DestructionsSidebarProps) {
  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsersForFilter();
  const branches = (branchesData || []).filter((b) => b.isActive);
  const users = usersData || [];
  const { selectedBranch } = useBranchStore();

  const [branchIds, setBranchIds] = useState<number[]>(() =>
    selectedBranch ? [selectedBranch.id] : []
  );
  const [statusList, setStatusList] = useState<number[]>([1, 2]);
  const [creatorId, setCreatorId] = useState("");
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const branchDropRef = useRef<HTMLDivElement>(null);
  const statusDropRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        branchDropRef.current &&
        !branchDropRef.current.contains(e.target as Node)
      )
        setShowBranchDropdown(false);
      if (
        statusDropRef.current &&
        !statusDropRef.current.contains(e.target as Node)
      )
        setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh ở header
  // thì tick lại chi nhánh đó. Skip lần mount đầu. Chỉ ghi đè khi đang ở chế độ
  // "bám theo header" (đúng 1 chi nhánh); giữ nguyên nếu user lọc nhiều chi
  // nhánh (>=2) hoặc "Tất cả chi nhánh" (rỗng).
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
      setBranchIds((prev) =>
        prev.length === 1 ? (cur ? [cur] : []) : prev
      );
    }
  }, [selectedBranch?.id]);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchIds.length > 0) f.branchIds = branchIds;
      if (statusList.length > 0) f.status = statusList;
      if (creatorId) f.createdById = parseInt(creatorId);

      const range =
        dateMode === "preset"
          ? getDateRangeFromPreset(selectedPreset)
          : fromDate && toDate
            ? {
                from: new Date(fromDate + "T00:00:00"),
                to: new Date(toDate + "T23:59:59"),
              }
            : getDateRangeFromPreset("this_month");

      f.fromDestructionDate = range.from.toISOString();
      f.toDestructionDate = range.to.toISOString();

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [branchIds, statusList, creatorId, dateMode, selectedPreset, fromDate, toDate]);

  const activeFilterCount = useMemo(
    () =>
      [
        branchIds.length > 0,
        statusList.length !== 2,
        !!creatorId,
        dateMode === "custom" && !!(fromDate && toDate),
      ].filter(Boolean).length,
    [branchIds, statusList, creatorId, dateMode, fromDate, toDate]
  );

  const clearAll = () => {
    setBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setStatusList([1, 2]);
    setCreatorId("");
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
  };

  const toggleBranch = (id: number) =>
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );

  const toggleStatus = (s: number) =>
    setStatusList((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const presetLabel =
    PRESET_GROUPS.flatMap((g) => g.options).find(
      (o) => o.value === selectedPreset
    )?.label ?? "Chọn nhanh";

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
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Chi nhánh
          </label>
          <div ref={branchDropRef} className="relative">
            <button
              type="button"
              onClick={() => setShowBranchDropdown((o) => !o)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                branchIds.length > 0
                  ? "border-brand bg-brand-soft text-gray-800"
                  : "border-gray-200 text-gray-400"
              } ${showBranchDropdown ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
              <span className="truncate">
                {branchIds.length > 0
                  ? `${branchIds.length} chi nhánh`
                  : "Tất cả chi nhánh"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showBranchDropdown ? "rotate-180" : ""}`}
              />
            </button>
            {showBranchDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {(branches || []).map((branch: any) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranch(branch.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left">
                    <input
                      type="checkbox"
                      checked={branchIds.includes(branch.id)}
                      readOnly
                      className="rounded"
                    />
                    <span className="truncate">{branch.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {branchIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {branchIds.map((id) => {
                const b = (branches || []).find((x: any) => x.id === id);
                return b ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-soft text-brand-dark rounded-full text-xs">
                    {b.name}
                    <button onClick={() => toggleBranch(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* ── Trạng thái ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Trạng thái
          </label>
          <div ref={statusDropRef} className="relative">
            <button
              type="button"
              onClick={() => setShowStatusDropdown((o) => !o)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                statusList.length > 0
                  ? "border-brand bg-brand-soft text-gray-800"
                  : "border-gray-200 text-gray-400"
              } ${showStatusDropdown ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
              <span className="truncate">
                {statusList.length > 0
                  ? STATUS_OPTIONS.filter((o) => statusList.includes(o.value))
                      .map((o) => o.label)
                      .join(", ")
                  : "Tất cả trạng thái"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showStatusDropdown ? "rotate-180" : ""}`}
              />
            </button>
            {showStatusDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 text-left">
                    <input
                      type="checkbox"
                      checked={statusList.includes(opt.value)}
                      readOnly
                      className="rounded"
                    />
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Người tạo ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Người tạo
          </label>
          <SimpleDropdown
            label="Tất cả người tạo"
            value={creatorId}
            options={users.map((u: any) => ({
              value: String(u.id),
              label: u.name,
            }))}
            onChange={setCreatorId}
          />
        </div>

        {/* ── Thời gian ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Thời gian xuất hủy
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
              <input
                type="radio"
                readOnly
                checked={dateMode === "preset"}
                className="accent-brand flex-shrink-0"
              />
              <span
                className={`text-sm truncate flex-1 ${dateMode === "preset" ? "text-brand-dark font-medium" : "text-gray-500"}`}>
                {dateMode === "preset" ? presetLabel : "Chọn nhanh"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Custom date range row */}
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${
                dateMode === "custom"
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <input
                type="radio"
                readOnly
                checked={dateMode === "custom"}
                className="accent-brand flex-shrink-0"
              />
              <span
                className={`text-sm ${dateMode === "custom" ? "text-brand-dark font-medium" : "text-gray-500"}`}>
                Tùy chỉnh
              </span>
            </div>

            {/* Date pickers (only when custom) */}
            {dateMode === "custom" && (
              <div className="space-y-2 pt-1">
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
                          minDate={field === "to" ? fromDate : undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
