"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomerGroups } from "@/lib/hooks/useCustomers";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";

// ─── Types ───
export type ReportType =
  | "customer-sales"
  | "product-by-customer"
  | "customer-debt";

interface CustomerReportSidebarProps {
  onFiltersChange: (filters: any) => void;
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
}

// ─── Preset helpers (clone từ OrdersSidebar) ───
const PRESET_GROUPS = [
  {
    label: "Nhanh",
    items: [
      { value: "today", label: "Hôm nay" },
      { value: "yesterday", label: "Hôm qua" },
      { value: "this_week", label: "Tuần này" },
      { value: "last_week", label: "Tuần trước" },
    ],
  },
  {
    label: "Tháng",
    items: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
      { value: "last_30_days", label: "30 ngày" },
    ],
  },
  {
    label: "Quý / Năm",
    items: [
      { value: "this_quarter", label: "Quý này" },
      { value: "last_quarter", label: "Quý trước" },
      { value: "this_year", label: "Năm nay" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  last_30_days: "30 ngày",
  this_quarter: "Quý này",
  last_quarter: "Quý trước",
  this_year: "Năm nay",
};

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

function getDateRangeFromPreset(preset: string) {
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
      const e =
        q === 0
          ? new Date(now.getFullYear() - 1, 11, 31)
          : new Date(now.getFullYear(), q * 3, 0);
      return { from: s, to: e };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: today, to: now };
  }
}

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

// ─── PresetPanel (clone từ OrdersSidebar) ───
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
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${selected === opt.value ? "bg-blue-600 text-white border-blue-600 font-medium shadow-sm" : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"}`}>
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

// ═══════════════════════════════════════════════════════════════════════════════
export function CustomerReportSidebar({
  onFiltersChange,
  reportType,
  onReportTypeChange,
}: CustomerReportSidebarProps) {
  const { data: branches } = useBranches();
  const { data: groupsData } = useCustomerGroups();
  const { data: users } = useUsersForFilter();
  const { data: saleChannels } = useSaleChannels();

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState("");
  // Lưu object KH đã chọn để vẫn hiển thị tên sau khi xoá ô tìm (không còn
  // fetch toàn bộ KH để dò tên nữa).
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: number;
    name: string;
    code?: string;
  } | null>(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [soldById, setSoldById] = useState("");
  const [saleChannelId, setSaleChannelId] = useState("");

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_week");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const [calAnchorRect, setCalAnchorRect] = useState<DOMRect | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Debounce từ khoá tìm khách hàng (gọi backend /customers/search → khớp
  // từ trọn vẹn, không còn giới hạn 1000 KH như trước).
  useEffect(() => {
    const timer = setTimeout(
      () => setCustomerSearchDebounced(customerSearch.trim()),
      300
    );
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const { data: customerSearchData } = useSearchCustomers(
    customerSearchDebounced
  );
  const filteredCustomers = useMemo(
    () => customerSearchData?.data || [],
    [customerSearchData]
  );

  const groups = useMemo(() => groupsData?.data || [], [groupsData]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchId) n++;
    if (customerId) n++;
    if (customerGroupId) n++;
    if (soldById) n++;
    if (saleChannelId) n++;
    return n;
  }, [branchId, customerId, customerGroupId, soldById, saleChannelId]);

  // Click outside customer dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        customerRef.current &&
        !customerRef.current.contains(e.target as Node)
      )
        setShowCustomerDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Click outside calendar (portal)
  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      // Không đóng nếu click vào trong calendar portal hoặc trigger
      const calPortal = document.querySelector("[data-report-calendar]");
      if (calPortal && calPortal.contains(target)) return;
      if (customDateRef.current && customDateRef.current.contains(target))
        return;
      setOpenCal(null);
      setCalAnchorRect(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

  // Validate: nếu user chỉ chọn "Đến ngày" mà chưa chọn "Từ ngày" → invalid
  const isFromMissing = dateMode === "custom" && !!toDate && !fromDate;

  // Debounce emit filters
  useEffect(() => {
    // Trạng thái invalid: chặn emit để tránh request lệch (toàn lịch sử bị gộp vào ghi nợ)
    if (isFromMissing) return;

    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (customerId) f.customerId = parseInt(customerId);
      if (customerGroupId) f.customerGroupId = parseInt(customerGroupId);
      if (soldById) f.soldById = parseInt(soldById);
      if (saleChannelId) f.saleChannelId = parseInt(saleChannelId);

      const range =
        dateMode === "preset"
          ? getDateRangeFromPreset(selectedPreset)
          : fromDate && toDate
            ? { from: new Date(fromDate), to: new Date(toDate) }
            : getDateRangeFromPreset("this_week");

      f.fromDate = range.from.toISOString();
      f.toDate = range.to.toISOString();

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    customerId,
    customerGroupId,
    soldById,
    saleChannelId,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    isFromMissing,
  ]);

  const clearAll = () => {
    setBranchId("");
    setCustomerId("");
    setCustomerSearch("");
    setCustomerGroupId("");
    setSoldById("");
    setSaleChannelId("");
    setDateMode("preset");
    setSelectedPreset("this_week");
    setFromDate("");
    setToDate("");
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

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Loại báo cáo ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Loại báo cáo
          </label>
          <select
            value={reportType}
            onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="customer-sales">Bán hàng</option>
            <option value="product-by-customer">Hàng bán theo khách</option>
            <option value="customer-debt">Công nợ</option>
          </select>
        </div>

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
                  const isInvalid = isFrom && isFromMissing;

                  return (
                    <div key={field}>
                      <span
                        className={`text-xs mb-1 block ${
                          isInvalid
                            ? "text-red-600 font-medium"
                            : "text-gray-500"
                        }`}>
                        {label}
                        {isInvalid && " *"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${
                          isInvalid
                            ? "border-red-400 bg-red-50 text-red-600"
                            : val
                              ? "border-blue-300 bg-blue-50 text-gray-800"
                              : "border-gray-200 text-gray-400"
                        } ${
                          isOpen
                            ? isInvalid
                              ? "ring-2 ring-red-100 border-red-500"
                              : "ring-2 ring-blue-100 border-blue-400"
                            : isInvalid
                              ? "hover:border-red-500"
                              : "hover:border-gray-300"
                        }`}>
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
                        <Calendar
                          className={`w-4 h-4 flex-shrink-0 ${
                            isInvalid ? "text-red-500" : "text-gray-400"
                          }`}
                        />
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
                {isFromMissing && (
                  <p className="text-xs text-red-600 -mt-1">
                    Vui lòng chọn &quot;Từ ngày&quot;
                  </p>
                )}
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
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Chi nhánh
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="">Tất cả</option>
            {(branches || []).map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Khách hàng (search dropdown) ── */}
        <div ref={customerRef}>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Khách hàng
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={
                selectedCustomer ? selectedCustomer.name : "Tìm khách hàng..."
              }
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDrop(true);
              }}
              onFocus={() => setShowCustomerDrop(true)}
              className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${selectedCustomer ? "bg-blue-50 border-blue-300" : "bg-white"}`}
            />
            {selectedCustomer && (
              <button
                onClick={() => {
                  setCustomerId("");
                  setCustomerSearch("");
                  setSelectedCustomer(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                ✕
              </button>
            )}
            {showCustomerDrop && filteredCustomers.length > 0 && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomerId(String(c.id));
                      setSelectedCustomer({
                        id: c.id,
                        name: c.name,
                        code: c.code,
                      });
                      setCustomerSearch("");
                      setShowCustomerDrop(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${String(c.id) === customerId ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}>
                    <span className="font-medium">{c.name}</span>
                    {c.code && (
                      <span className="text-gray-400 ml-1">({c.code})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Nhóm khách hàng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Nhóm khách hàng
          </label>
          <select
            value={customerGroupId}
            onChange={(e) => setCustomerGroupId(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="">Tất cả</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── NV bán hàng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            NV bán hàng
          </label>
          <select
            value={soldById}
            onChange={(e) => setSoldById(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="">Tất cả</option>
            {(users || []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Kênh bán hàng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Kênh bán hàng
          </label>
          <select
            value={saleChannelId}
            onChange={(e) => setSaleChannelId(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="">Tất cả</option>
            {(saleChannels || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
