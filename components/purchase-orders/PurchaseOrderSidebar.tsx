"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { PurchaseOrderFilters } from "@/lib/types/purchase-order";

interface PurchaseOrderSidebarProps {
  filters: PurchaseOrderFilters;
  setFilters: (filters: Partial<PurchaseOrderFilters>) => void;
}

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    value: "0",
    label: "Phiếu tạm",
    color: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  {
    value: "1",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "2",
    label: "Đã hủy",
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
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return (
    <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11);
              setViewYear((y) => y - 1);
            } else setViewMonth((m) => m - 1);
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
            } else setViewMonth((m) => m + 1);
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
          if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} />;
          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isSel = ds === value;
          const isToday =
            new Date(viewYear, viewMonth, dayNum).getTime() ===
            todayObj.getTime();
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
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs text-brand font-medium px-2 py-1 rounded hover:bg-brand-soft">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

// ─── PresetPanel (portal) — mở NGANG sang phải ───────────────────────────────
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
        !panelRef.current?.contains(e.target as Node) &&
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
                  ? "bg-brand text-white border-brand font-medium"
                  : "bg-white text-gray-700 border-gray-200 hover:border-brand hover:bg-brand-soft"
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
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"} bg-white`}>
        {selected ? (
          <span
            className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${selected.color}`}>
            {selected.label}
          </span>
        ) : (
          <span className="text-gray-400 flex-1">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${!value ? "bg-brand-soft" : "hover:bg-gray-50"}`}>
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
            <span className="flex-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Tất cả trạng thái
            </span>
            {!value && (
              <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
            )}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${value === opt.value ? "bg-brand-soft" : "hover:bg-gray-50"}`}>
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
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"} bg-white`}>
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
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${!value ? "bg-brand-soft text-brand-dark font-medium" : "hover:bg-gray-50 text-gray-500"}`}>
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5 text-brand" />}
          </button>
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${value === opt.value ? "bg-brand-soft text-brand-dark font-medium" : "hover:bg-gray-50 text-gray-700"}`}>
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

// ─── BranchMultiSelectDropdown ────────────────────────────────────────────────
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
            ? "border-brand ring-2 ring-brand-soft"
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
                selectedIds.includes(b.id) ? "bg-brand-soft" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <input
                type="checkbox"
                checked={selectedIds.includes(b.id)}
                onChange={() => {}}
                className="w-3.5 h-3.5 accent-brand flex-shrink-0"
              />
              <span className="text-gray-700">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PurchaseOrderSidebar({
  filters,
  setFilters,
}: PurchaseOrderSidebarProps) {
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({ pageSize: 1000 });
  const { data: users } = useUsersForFilter();
  const { selectedBranch } = useBranchStore();

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  // Mặc định bám theo chi nhánh đang chọn ở DashboardHeader. Nếu filter đã có
  // branchIds (vd restore từ chỗ khác) thì ưu tiên, fallback branchId đơn lẻ.
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(() => {
    if (filters.branchIds && filters.branchIds.length > 0)
      return filters.branchIds;
    if (filters.branchId) return [filters.branchId];
    if (selectedBranch) return [selectedBranch.id];
    return [];
  });
  const [statusValue, setStatusValue] = useState(
    filters.status !== undefined ? String(filters.status) : ""
  );
  const [supplierValue, setSupplierValue] = useState(
    filters.supplierId ? String(filters.supplierId) : ""
  );
  const [createdByValue, setCreatedByValue] = useState(
    filters.createdById ? String(filters.createdById) : ""
  );
  const [purchaseByValue, setPurchaseByValue] = useState(
    filters.purchaseById ? String(filters.purchaseById) : ""
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

  // Đẩy chi nhánh đã chọn lên filters (dạng branchIds[]). Mảng rỗng = "Tất cả
  // chi nhánh" → xem chéo mọi chi nhánh.
  useEffect(() => {
    setFilters({
      branchIds: selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
      branchId: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchIds]);

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh, tick lại
  // chi nhánh đó. Skip lần mount đầu để không ghi đè lựa chọn ban đầu. Chỉ ghi
  // đè khi đang ở chế độ "bám theo header" (đúng 1 chi nhánh); nếu user đang lọc
  // nhiều chi nhánh (>=2) hoặc "Tất cả chi nhánh" (rỗng) thì giữ nguyên.
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
    if (selectedBranchIds.length > 0) n++;
    if (statusValue) n++;
    if (supplierValue) n++;
    if (createdByValue) n++;
    if (purchaseByValue) n++;
    if (dateMode === "custom" && fromDate && toDate) n++;
    if (dateMode === "preset" && selectedPreset !== "all_time") n++;
    return n;
  }, [
    selectedBranchIds,
    statusValue,
    supplierValue,
    createdByValue,
    purchaseByValue,
    dateMode,
    fromDate,
    toDate,
    selectedPreset,
  ]);

  const resetFilters = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setStatusValue("");
    setSupplierValue("");
    setCreatedByValue("");
    setPurchaseByValue("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    setFilters({
      status: undefined,
      supplierId: undefined,
      createdById: undefined,
      purchaseById: undefined,
      createdDateFrom: undefined,
      createdDateTo: undefined,
    });
  };

  const activeBranches = useMemo(
    () =>
      branches
        ?.filter((b) => b.isActive)
        .map((b) => ({ id: b.id, name: b.name })) ?? [],
    [branches]
  );
  const supplierOptions = useMemo<SimpleOption[]>(
    () =>
      suppliersData?.data?.map((s: any) => ({
        value: String(s.id),
        label: s.name,
      })) ?? [],
    [suppliersData]
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
            className="text-sm text-brand hover:text-brand-dark font-medium">
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
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${dateMode === "preset" ? "border-brand bg-brand-soft" : "border-gray-200 hover:border-gray-300"}`}>
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
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${dateMode === "custom" ? "border-brand bg-brand-soft" : "border-gray-200 hover:border-gray-300"}`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${dateMode === "custom" ? "border-brand" : "border-gray-300"}`}>
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
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;
                  return (
                    <div key={field} className="relative">
                      <span className="text-xs text-gray-500 mb-1 block">
                        {isFrom ? "Từ ngày" : "Đến ngày"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${val ? "border-brand bg-brand-soft text-gray-800" : "border-gray-200 text-gray-400"} ${isOpen ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
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
                            const newFrom = isFrom ? v : fromDate;
                            const newTo = isFrom ? toDate : v;
                            if (newFrom && newTo) {
                              setFilters({
                                createdDateFrom: new Date(
                                  newFrom + "T00:00:00"
                                ).toISOString(),
                                createdDateTo: new Date(
                                  newTo + "T23:59:59"
                                ).toISOString(),
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
          <StatusDropdown
            options={STATUS_OPTIONS}
            value={statusValue}
            placeholder="Tất cả trạng thái"
            onChange={(v) => {
              setStatusValue(v);
              setFilters({ status: v !== "" ? Number(v) : undefined });
            }}
          />
        </div>

        {/* Chi nhánh */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Chi nhánh
          </label>
          <BranchMultiSelectDropdown
            branches={activeBranches}
            selectedIds={selectedBranchIds}
            onChange={setSelectedBranchIds}
          />
        </div>

        {/* Nhà cung cấp */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Nhà cung cấp
          </label>
          <SimpleDropdown
            options={supplierOptions}
            value={supplierValue}
            placeholder="Tất cả NCC"
            onChange={(v) => {
              setSupplierValue(v);
              setFilters({ supplierId: v ? Number(v) : undefined });
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

        {/* Người nhập hàng */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Người nhập hàng
          </label>
          <SimpleDropdown
            options={userOptions}
            value={purchaseByValue}
            placeholder="Tất cả"
            onChange={(v) => {
              setPurchaseByValue(v);
              setFilters({ purchaseById: v ? Number(v) : undefined });
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
