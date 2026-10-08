"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useInternalUsePurposes } from "@/lib/hooks/useInternalUses";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { normalizeRectForFixed } from "@/lib/utils/zoom";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import { PurposeForm } from "./PurposeForm";
import type { InternalUsePurpose } from "@/lib/api/internalUses";

interface InternalUsesSidebarProps {
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
    label: "Tất cả",
    options: [{ value: "all_time", label: "Toàn thời gian" }],
  },
  {
    label: "Theo ngày",
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
      { value: "last_7_days", label: "7 ngày qua" },
    ],
  },
  {
    label: "Tháng",
    options: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
      { value: "last_30_days", label: "30 ngày qua" },
    ],
  },
  {
    label: "Theo quý",
    options: [
      { value: "this_quarter", label: "Quý này" },
      { value: "last_quarter", label: "Quý trước" },
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
      return {
        from: s,
        to: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999),
      };
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
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: now,
      };
    }
    case "last_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      return {
        from: new Date(year, lastQuarter * 3, 1),
        to: new Date(year, lastQuarter * 3 + 3, 0, 23, 59, 59, 999),
      };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case "all_time":
      return null;
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
  const r = normalizeRectForFixed(anchorRect);
  const top = r.top;
  const left = r.right + 8;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top, left, zIndex: 1000 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex gap-5 animate-in fade-in zoom-in-95 duration-150">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-1.5 min-w-[88px]">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {g.label}
          </div>
          {g.options.map((opt) => (
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

// ─── PurposeSelect (dropdown + quản lý mục đích) ─────────────────────────────
function PurposeSelect({
  purposes,
  value,
  onChange,
  canManage,
  onCreate,
  onEdit,
}: {
  purposes: InternalUsePurpose[];
  value: string;
  onChange: (v: string) => void;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (e: React.MouseEvent, purpose: InternalUsePurpose) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = search
    ? purposes.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : purposes;
  const selected = purposes.find((p) => String(p.id) === value);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">
          Mục đích sử dụng
        </label>
        {canManage && (
          <button
            type="button"
            onClick={onCreate}
            className="text-gray-400 hover:text-brand p-0.5 rounded"
            title="Thêm mục đích sử dụng">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer transition-all ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <span
          className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.name : "Tất cả mục đích"}
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
                onChange("");
                setOpen(false);
                setSearch("");
              }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                !value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}>
              Tất cả mục đích
            </button>
            {filtered.map((purpose) => (
              <div
                key={purpose.id}
                className={`flex items-center justify-between hover:bg-gray-50 ${
                  value === String(purpose.id)
                    ? "bg-brand-soft text-brand-dark"
                    : "text-gray-700"
                }`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(
                      value === String(purpose.id) ? "" : String(purpose.id)
                    );
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex-1 px-3 py-2.5 text-left text-sm">
                  {purpose.name}
                </button>
                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => onEdit(e, purpose)}
                    className="px-3 py-2 text-gray-400 hover:text-brand">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
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

// ─── Main ────────────────────────────────────────────────────────────────────
export function InternalUsesSidebar({
  onFiltersChange,
}: InternalUsesSidebarProps) {
  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsersForFilter();
  const { data: purposesData } = useInternalUsePurposes();
  const branches = (branchesData || []).filter((b) => b.isActive);
  const users = usersData || [];
  const purposes = purposesData || [];
  const { selectedBranch } = useBranchStore();

  const branchOptions = useMemo(
    () => branches.map((b: any) => ({ value: String(b.id), label: b.name })),
    [branches]
  );
  const userOptions = useMemo(
    () => users.map((u: any) => ({ value: String(u.id), label: u.name })),
    [users]
  );

  const canManagePurpose = usePermission("internal-use-purpose", "manage");
  const STORAGE_KEY = "internal-uses-sidebar-filters";
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
  const [showPurposeForm, setShowPurposeForm] = useState(false);
  const [editingPurpose, setEditingPurpose] =
    useState<InternalUsePurpose | null>(null);

  const [branchIds, setBranchIds] = useState<number[]>(() =>
    (() => {
      const savedIds = saved.current?.selectedBranchIds;
      if (Array.isArray(savedIds)) {
        // Giữ nguyên lựa chọn nhiều chi nhánh hoặc tất cả chi nhánh.
        if (savedIds.length >= 2 || savedIds.length === 0) return savedIds;
      }
      // Một chi nhánh luôn bám theo chi nhánh đang chọn trên header.
      if (selectedBranch) return [selectedBranch.id];
      return Array.isArray(savedIds) ? savedIds : [];
    })()
  );
  const [statusList, setStatusList] = useState<number[]>(
    saved.current?.statusList || [1, 2]
  );
  const [creatorId, setCreatorId] = useState(saved.current?.creatorId || "");
  const [userId, setUserId] = useState(saved.current?.userId || "");
  const [purposeId, setPurposeId] = useState(saved.current?.purposeId || "");
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    saved.current?.dateMode || "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState(
    saved.current?.selectedPreset || "all_time"
  );
  const [fromDate, setFromDate] = useState(saved.current?.fromDate || "");
  const [toDate, setToDate] = useState(saved.current?.toDate || "");

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const statusDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        statusDropRef.current &&
        !statusDropRef.current.contains(e.target as Node)
      )
        setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sync chi nhánh đang chọn ở header (bám theo header khi đang lọc 1 chi nhánh)
  const isFirstBranchSyncRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );

  // Persist filter state giống OrdersSidebar để rời trang/quay lại vẫn giữ
  // đúng bộ lọc người dùng đã chọn.
  useEffect(() => {
    const state = {
      selectedBranchIds: branchIds,
      statusList,
      creatorId,
      userId,
      purposeId,
      dateMode,
      selectedPreset,
      fromDate,
      toDate,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    branchIds,
    statusList,
    creatorId,
    userId,
    purposeId,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  // Khi đổi branch trên DashboardHeader:
  // - Bỏ qua lần mount đầu để không ghi đè state đã restore.
  // - Nếu đang lọc nhiều branch hoặc tất cả branch thì giữ nguyên.
  // - Nếu đang bám một branch thì chuyển theo branch mới trên header.
  useEffect(() => {
    const cur = selectedBranch?.id ?? null;
    if (isFirstBranchSyncRef.current) {
      isFirstBranchSyncRef.current = false;
      lastSyncedBranchIdRef.current = cur;
      return;
    }
    if (cur !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = cur;
      setBranchIds((prev) => (prev.length === 1 ? (cur ? [cur] : []) : prev));
    }
  }, [selectedBranch?.id]);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchIds.length > 0) f.branchIds = branchIds;
      if (statusList.length > 0) f.status = statusList;
      if (creatorId) f.createdById = parseInt(creatorId);
      if (userId) f.userId = parseInt(userId);
      if (purposeId) f.purposeId = parseInt(purposeId);

      const range =
        dateMode === "preset"
          ? getDateRangeFromPreset(selectedPreset)
          : fromDate && toDate
            ? {
                from: new Date(fromDate + "T00:00:00"),
                to: new Date(toDate + "T23:59:59"),
              }
            : getDateRangeFromPreset("this_month");

      if (range) {
        f.fromDate = range.from.toISOString();
        f.toDate = range.to.toISOString();
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchIds,
    statusList,
    creatorId,
    userId,
    purposeId,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const activeFilterCount = useMemo(
    () =>
      [
        branchIds.length > 0,
        statusList.length !== 2,
        !!creatorId,
        !!userId,
        !!purposeId,
        dateMode === "custom" && !!(fromDate && toDate),
      ].filter(Boolean).length,
    [branchIds, statusList, creatorId, userId, purposeId, dateMode, fromDate, toDate]
  );

  const clearAll = () => {
    setBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setStatusList([1, 2]);
    setCreatorId("");
    setUserId("");
    setPurposeId("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    localStorage.removeItem(STORAGE_KEY);
  };

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
          <FilterMultiSelect
            options={branchOptions}
            values={branchIds.map(String)}
            onChange={(vals) => setBranchIds(vals.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>

        {/* ── Trạng thái ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Trạng thái
          </label>
          <div ref={statusDropRef} className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowStatusDropdown((o) => !o)}
              onKeyDown={(event) =>
                event.key === "Enter" &&
                setShowStatusDropdown((o) => !o)
              }
              className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
                showStatusDropdown
                  ? "border-brand ring-2 ring-brand-soft"
                  : "hover:border-gray-400"
              } bg-white`}>
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {statusList.length > 0 ? (
                  STATUS_OPTIONS.filter((option) =>
                    statusList.includes(option.value)
                  ).map((option) => (
                    <span
                      key={option.value}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${option.color}`}>
                      {option.label}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">
                    Tất cả trạng thái
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {statusList.length > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setStatusList([]);
                    }}
                    className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
                    <X className="w-3 h-3" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showStatusDropdown ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
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
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
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

        {/* ── Thời gian ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
            Thời gian
            </label>
          </div>
          <div className="space-y-1.5">
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
                  dateMode === "preset"
                    ? "border-brand"
                    : "border-gray-300"
                }`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {presetLabel}
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-colors flex-shrink-0 ${
                  showPresetPanel ? "text-brand" : "text-gray-400"
                }`}
              />
            </div>

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
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  dateMode === "custom"
                    ? "border-brand"
                    : "border-gray-300"
                }`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">
                Tùy chỉnh
              </span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>

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

        {/* ── Người tạo ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Người tạo
          </label>
          <FilterSearchableSelect
            options={userOptions}
            value={creatorId}
            placeholder="Tất cả người tạo"
            searchPlaceholder="Tìm người tạo..."
            onChange={setCreatorId}
          />
        </div>

        {/* ── Người sử dụng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Người sử dụng
          </label>
          <FilterSearchableSelect
            options={userOptions}
            value={userId}
            placeholder="Tất cả người sử dụng"
            searchPlaceholder="Tìm người sử dụng..."
            onChange={setUserId}
          />
        </div>

        {/* ── Mục đích sử dụng ── */}
        <PurposeSelect
          purposes={purposes}
          value={purposeId}
          onChange={setPurposeId}
          canManage={canManagePurpose}
          onCreate={() => {
            setEditingPurpose(null);
            setShowPurposeForm(true);
          }}
          onEdit={(e, purpose) => {
            e.stopPropagation();
            setEditingPurpose(purpose);
            setShowPurposeForm(true);
          }}
        />
      </div>

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

      <PurposeForm
        isOpen={showPurposeForm}
        purpose={editingPurpose}
        onClose={() => {
          setShowPurposeForm(false);
          setEditingPurpose(null);
        }}
      />
    </aside>
  );
}
