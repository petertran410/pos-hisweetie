"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
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
        className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:border-blue-300 transition-colors">
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50">
            {placeholder}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center justify-between ${
                value === o.value ? "text-blue-600 bg-blue-50" : "text-gray-700"
              }`}>
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
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-2">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
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
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  selected === opt.value
                    ? "bg-blue-600 text-white border-blue-600 font-medium shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
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
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

export function CashFlowsSidebar({
  filters,
  onFiltersChange,
}: CashFlowsSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();

  const [branchId, setBranchId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchId) n++;
    if (selectedType) n++;
    if (selectedStatus) n++;
    if (selectedMethod) n++;
    if (creatorId) n++;
    if (partnerName) n++;
    return n;
  }, [
    branchId,
    selectedType,
    selectedStatus,
    selectedMethod,
    creatorId,
    partnerName,
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
      if (branchId) f.branchIds = [parseInt(branchId)];
      if (selectedType === "receipt") f.isReceipt = true;
      else if (selectedType === "payment") f.isReceipt = false;

      // Trạng thái: "0_receipt" = status 0 + isReceipt true, "0_payment" = status 0 + isReceipt false, "2" = status 2
      if (selectedStatus === "0_receipt") {
        f.status = 0;
        f.isReceipt = true;
      } else if (selectedStatus === "0_payment") {
        f.status = 0;
        f.isReceipt = false;
      } else if (selectedStatus === "2") {
        f.status = 2;
      }

      if (selectedMethod) f.method = [selectedMethod];
      if (creatorId) f.userId = parseInt(creatorId);
      if (partnerName) f.partnerName = partnerName;

      const range =
        dateMode === "preset"
          ? getDateRangeFromPreset(selectedPreset)
          : fromDate && toDate
            ? { from: new Date(fromDate), to: new Date(toDate) }
            : getDateRangeFromPreset("this_month");
      f.startDate = range.from.toISOString();
      f.endDate = range.to.toISOString();

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    selectedType,
    selectedStatus,
    selectedMethod,
    creatorId,
    partnerName,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
  ]);

  const clearAll = () => {
    setBranchId("");
    setSelectedType("");
    setSelectedStatus("");
    setSelectedMethod("");
    setCreatorId("");
    setPartnerName("");
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
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
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${
                dateMode === "preset"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  dateMode === "preset" ? "border-blue-600" : "border-gray-300"
                }`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {PRESET_LABEL[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-colors flex-shrink-0 ${
                  showPresetPanel ? "text-blue-500" : "text-gray-400"
                }`}
              />
            </div>

            {/* Row: Tùy chỉnh (radio) */}
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
                      <span className="text-xs text-gray-500 mb-1 block">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
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

        {/* ── Loại phiếu — Dropdown ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <SimpleDropdown
            options={[
              { value: "0_receipt", label: "Đã thanh toán" },
              { value: "0_payment", label: "Đã chi" },
              { value: "2", label: "Đã hủy" },
            ]}
            value={selectedStatus}
            placeholder="Tất cả"
            onChange={setSelectedStatus}
          />
        </div>

        {/* ── Phương thức ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phương thức
          </label>
          <SimpleDropdown
            options={METHOD_OPTIONS}
            value={selectedMethod}
            placeholder="Tất cả"
            onChange={setSelectedMethod}
          />
        </div>

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <SimpleDropdown
            options={
              branches?.map((b: any) => ({
                value: String(b.id),
                label: b.name,
              })) ?? []
            }
            value={branchId}
            placeholder="Tất cả chi nhánh"
            onChange={setBranchId}
          />
        </div>

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

        {/* ── Người nộp/nhận ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người nộp/nhận
          </label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:border-blue-300 transition-colors focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </aside>
  );
}
