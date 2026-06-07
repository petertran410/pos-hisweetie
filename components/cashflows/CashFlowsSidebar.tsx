"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useBankAccounts } from "@/lib/hooks/useBankAccounts";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

interface CashFlowsSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "ewallet", label: "Ví điện tử" },
];

const PRESET_GROUPS = [
  {
    label: "Tất cả",
    items: [{ value: "all_time", label: "Toàn bộ" }],
  },
  {
    label: "Nhanh",
    items: [
      { value: "today", label: "Hôm nay" },
      { value: "yesterday", label: "Hôm qua" },
    ],
  },
  {
    label: "Tuần",
    items: [
      { value: "this_week", label: "Tuần này" },
      { value: "last_week", label: "Tuần trước" },
      { value: "last_7_days", label: "7 ngày qua" },
    ],
  },
  {
    label: "Tháng",
    items: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
      { value: "last_30_days", label: "30 ngày qua" },
    ],
  },
  {
    label: "Quý / Năm",
    items: [
      { value: "this_quarter", label: "Quý này" },
      { value: "last_quarter", label: "Quý trước" },
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
      const s =
        q === 0
          ? new Date(now.getFullYear() - 1, 9, 1)
          : new Date(now.getFullYear(), (q - 1) * 3, 1);
      const e =
        q === 0
          ? new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
          : new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
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
};

const PRESET_LABEL: Record<string, string> = {
  all_time: "Toàn bộ",
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  last_7_days: "7 ngày qua",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  last_30_days: "30 ngày qua",
  this_quarter: "Quý này",
  last_quarter: "Quý trước",
  this_year: "Năm nay",
  last_year: "Năm trước",
};

// ─── SimpleDropdown (copy từ InvoicesSidebar) ────────────────────────────────
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: { value: string; label: string }[];
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="dt-input dt-input-sm w-full flex items-center justify-between text-left">
        <span style={{ color: selected ? "var(--dt-text)" : "var(--dt-text-muted)" }}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--dt-text-muted)" }} />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1 w-full bg-white border rounded-[8px] shadow-lg max-h-48 overflow-y-auto"
          style={{ borderColor: "var(--dt-border)" }}>
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="dt-menu-item w-full text-left px-3 py-1.5 text-sm"
            style={{ color: "var(--dt-text-muted)" }}>
            {placeholder}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="dt-menu-item w-full text-left px-3 py-1.5 text-sm flex items-center justify-between"
              style={
                value === o.value
                  ? { color: "var(--dt-primary)", background: "var(--dt-cyan-bg)" }
                  : { color: "var(--dt-text-secondary)" }
              }>
              {o.label}
              {value === o.value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PresetPanel (copy từ InvoicesSidebar) ───────────────────────────────────
function PresetPanel({
  groups,
  selected,
  onSelect,
  onClose,
  anchorRect,
  triggerRef,
}: {
  groups: { label: string; items: { value: string; label: string }[] }[];
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
        zIndex: 50,
        borderColor: "var(--dt-border)",
      }}
      className="bg-white border rounded-[8px] shadow-lg p-2 space-y-2">
      {groups.map((g) => (
        <div key={g.label}>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider px-1 mb-1"
            style={{ color: "var(--dt-text-muted)" }}>
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1">
            {g.items.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className="dt-chip px-2 py-0.5 text-xs rounded-full border transition-colors"
                data-on={selected === opt.value}>
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

// ─── MiniCalendar (copy từ InvoicesSidebar) ──────────────────────────────────
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
    <div
      className="mt-2 bg-white border rounded-[8px] p-3 shadow-sm select-none"
      style={{ borderColor: "var(--dt-border)" }}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="dt-icon-btn p-1 rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--dt-text)" }}>
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="dt-icon-btn p-1 rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium py-0.5"
            style={{ color: "var(--dt-text-muted)" }}>
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
          const cellStyle: React.CSSProperties = isSel
            ? { background: "var(--dt-primary)", color: "#fff", fontWeight: 700 }
            : isToday
              ? {
                  border: "1px solid var(--dt-primary)",
                  color: "var(--dt-primary)",
                  fontWeight: 600,
                }
              : isDisabled
                ? { color: "var(--dt-border)", cursor: "not-allowed" }
                : { color: "var(--dt-text-secondary)", cursor: "pointer" };
          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className="dt-cal-cell aspect-square text-xs rounded-lg flex items-center justify-center transition-colors"
              data-plain={!isSel && !isToday && !isDisabled}
              style={cellStyle}>
              {day}
            </button>
          );
        })}
      </div>
      <div
        className="flex justify-between mt-2 pt-2 border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="dt-icon-btn text-xs px-2 py-1 rounded">
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs font-medium px-2 py-1 rounded transition-colors"
          style={{ color: "var(--dt-primary)" }}>
          Hôm nay
        </button>
      </div>
    </div>
  );
}

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
        className="dt-input dt-input-sm w-full flex items-center justify-between gap-2 cursor-pointer select-none"
        style={
          open
            ? { borderColor: "var(--dt-primary)", boxShadow: "0 0 0 3px rgba(0,183,204,.1)" }
            : undefined
        }>
        <span
          className="truncate"
          style={{ color: label ? "var(--dt-text)" : "var(--dt-text-muted)" }}>
          {label ?? "Tất cả chi nhánh"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--dt-text-muted)" }} />
      </div>
      {open && (
        <div
          className="absolute z-30 mt-1 w-full bg-white border rounded-[8px] shadow-lg max-h-48 overflow-y-auto"
          style={{ borderColor: "var(--dt-border)" }}>
          {branches.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => toggle(b.id)}
              className="dt-menu-item w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left"
              style={{
                ...(selectedIds.includes(b.id) ? { background: "var(--dt-cyan-bg)" } : {}),
                ...(idx > 0 ? { borderTop: "1px solid var(--dt-border)" } : {}),
              }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(b.id)}
                onChange={() => {}}
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ accentColor: "var(--dt-primary)" }}
              />
              <span style={{ color: "var(--dt-text-secondary)" }}>{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CashFlowsSidebar({
  filters,
  onFiltersChange,
}: CashFlowsSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { data: bankAccounts } = useBankAccounts();

  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => b.isActive),
    [branches]
  );

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState("");

  const [branchId, setBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (selectedType) n++;
    if (selectedStatus) n++;
    if (selectedMethod) n++;
    if (selectedAccountId) n++;
    if (creatorId) n++;
    if (partnerName) n++;
    if (selectedPreset !== "all_time" || dateMode === "custom") n++;
    return n;
  }, [
    selectedBranchIds,
    selectedType,
    selectedStatus,
    selectedMethod,
    selectedAccountId,
    creatorId,
    partnerName,
    selectedPreset,
    dateMode,
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

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (selectedBranchIds.length > 0) f.branchIds = selectedBranchIds;

      if (selectedType === "receipt") f.isReceipt = true;
      else if (selectedType === "payment") f.isReceipt = false;

      if (selectedStatus) f.status = parseInt(selectedStatus);

      if (selectedMethod) f.method = [selectedMethod];
      if (selectedAccountId) f.accountId = parseInt(selectedAccountId);
      if (creatorId) f.userId = parseInt(creatorId);
      if (partnerName) f.partnerName = partnerName;

      if (selectedPreset !== "all_time" || dateMode === "custom") {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? { from: new Date(fromDate), to: new Date(toDate) }
              : getDateRangeFromPreset("this_month");
        f.startDate = range.from.toISOString();
        f.endDate = range.to.toISOString();
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    selectedType,
    selectedStatus,
    selectedMethod,
    selectedAccountId,
    creatorId,
    partnerName,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const clearAll = () => {
    setSelectedBranchIds([]);
    setSelectedType("");
    setSelectedStatus("");
    setSelectedMethod("");
    setSelectedAccountId("");
    setCreatorId("");
    setPartnerName("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  return (
    <aside className="dt-panel w-64 m-4 custom-sidebar-scroll flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-[8px]"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--dt-text)" }}>Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm font-medium"
            style={{ color: "var(--dt-primary)" }}>
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Thời gian ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: "var(--dt-text-secondary)" }}>
              Thời gian
            </label>
          </div>

          <div className="space-y-1.5">
            {/* Row: Preset (radio) */}
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
              className="dt-radio-row flex items-center gap-2.5 px-2 py-1 rounded-[4px] border cursor-pointer select-none"
              data-on={dateMode === "preset"}>
              <div
                className="w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ borderColor: dateMode === "preset" ? "var(--dt-primary)" : "var(--dt-border)" }}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--dt-primary)" }} />
                )}
              </div>
              <span className="text-sm flex-1 font-medium" style={{ color: "var(--dt-text-secondary)" }}>
                {PRESET_LABEL[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className="w-4 h-4 transition-colors flex-shrink-0"
                style={{ color: showPresetPanel ? "var(--dt-primary)" : "var(--dt-text-muted)" }}
              />
            </div>

            {/* Row: Tùy chỉnh (radio) */}
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className="dt-radio-row flex items-center gap-2.5 px-2 py-1 rounded-[4px] border cursor-pointer"
              data-on={dateMode === "custom"}>
              <div
                className="w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ borderColor: dateMode === "custom" ? "var(--dt-primary)" : "var(--dt-border)" }}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--dt-primary)" }} />
                )}
              </div>
              <span className="text-sm flex-1" style={{ color: "var(--dt-text-secondary)" }}>Tùy chỉnh</span>
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--dt-text-muted)" }} />
            </div>

            {/* Custom date fields — BÊN NGOÀI div "Tùy chỉnh" */}
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
                      <span className="text-xs mb-1 block" style={{ color: "var(--dt-text-muted)" }}>
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className="dt-input dt-input-sm w-full flex items-center justify-between"
                        style={{
                          ...(val ? { background: "var(--dt-cyan-bg)" } : { color: "var(--dt-text-muted)" }),
                          ...(isOpen
                            ? { borderColor: "var(--dt-primary)", boxShadow: "0 0 0 3px rgba(0,183,204,.1)" }
                            : {}),
                        }}>
                        <span style={{ color: val ? "var(--dt-text)" : "var(--dt-text-muted)" }}>
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
                        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--dt-text-muted)" }} />
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

        {/* ── Loại phiếu — Dropdown ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Loại phiếu
          </label>
          <SimpleDropdown
            options={[
              { value: "receipt", label: "Phiếu thu" },
              { value: "payment", label: "Phiếu chi" },
            ]}
            value={selectedType}
            placeholder="Tất cả"
            onChange={setSelectedType}
          />
        </div>

        {/* ── Trạng thái — Dropdown ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Trạng thái
          </label>
          <SimpleDropdown
            options={[
              { value: "0", label: "Đã thanh toán" },
              { value: "2", label: "Đã hủy" },
            ]}
            value={selectedStatus}
            placeholder="Tất cả"
            onChange={setSelectedStatus}
          />
        </div>

        {/* ── Phương thức ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Phương thức
          </label>
          <SimpleDropdown
            options={METHOD_OPTIONS}
            value={selectedMethod}
            placeholder="Tất cả"
            onChange={setSelectedMethod}
          />
        </div>

        {/* ── Tài khoản ngân hàng ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Tài khoản ngân hàng
          </label>
          <SimpleDropdown
            options={(Array.isArray(bankAccounts) ? bankAccounts : []).map(
              (acc: any) => ({
                value: String(acc.id),
                label: `${acc.bankCode || acc.bankName} - ${acc.accountNumber}`,
              })
            )}
            value={selectedAccountId}
            placeholder="Tất cả"
            onChange={setSelectedAccountId}
          />
        </div>

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Chi nhánh
          </label>
          <BranchMultiSelectDropdown
            branches={activeBranches}
            selectedIds={selectedBranchIds}
            onChange={setSelectedBranchIds}
          />
        </div>

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
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

        {/* ── Người nộp/nhận ── */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--dt-text-secondary)" }}>
            Người nộp/nhận
          </label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Tìm theo tên..."
            className="dt-input dt-input-sm w-full"
          />
        </div>
      </div>
    </aside>
  );
}
