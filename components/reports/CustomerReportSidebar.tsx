"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useCustomerGroups } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";

// ─── Types ───
export type ReportType = "customer-sales" | "product-by-customer";

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

// ─── MiniCalendar (clone từ OrdersSidebar) ───
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
  const init = value ? new Date(value) : todayObj;
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const [viewYear, setViewYear] = useState(init.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();

  return (
    <div className="bg-white border rounded-xl shadow-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) =>
              m === 0 ? (setViewYear((y) => y - 1), 11) : m - 1
            )
          }
          className="p-1 hover:bg-gray-100 rounded">
          ‹
        </button>
        <span className="text-sm font-semibold">{`${viewMonth + 1}/${viewYear}`}</span>
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) =>
              m === 11 ? (setViewYear((y) => y + 1), 0) : m + 1
            )
          }
          className="p-1 hover:bg-gray-100 rounded">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-400 mb-1">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSel = value === ds;
          const isToday = ds === todayObj.toISOString().split("T")[0];
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className={[
                "aspect-square text-xs rounded-lg flex items-center justify-center transition-colors",
                isSel
                  ? "bg-blue-600 text-white font-bold"
                  : isToday
                    ? "border border-blue-400 text-blue-600 font-semibold"
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
  const { data: customersData } = useCustomers({ pageSize: 1000 });
  const { data: groupsData } = useCustomerGroups();
  const { data: users } = useUsersForFilter();
  const { data: saleChannels } = useSaleChannels();

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
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

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const customers = useMemo(() => customersData?.data || [], [customersData]);
  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId]
  );
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

  // Click outside calendar
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

  // Debounce emit filters
  useEffect(() => {
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
          </select>
        </div>

        {/* ── Thời gian ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Thời gian
          </label>
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
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${dateMode === "preset" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${dateMode === "preset" ? "border-blue-600" : "border-gray-300"}`}>
                {dateMode === "preset" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-xs text-gray-700">
                {PRESET_LABELS[selectedPreset] || "Chọn..."}
              </span>
            </div>

            <div
              ref={customDateRef}
              onClick={() => {
                if (dateMode !== "custom") {
                  setDateMode("custom");
                  setShowPresetPanel(false);
                }
              }}
              className={`px-2 py-1 rounded-lg border transition-all ${dateMode === "custom" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 cursor-pointer"}`}>
              <div className="flex items-center gap-2.5 select-none">
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${dateMode === "custom" ? "border-blue-600" : "border-gray-300"}`}>
                  {dateMode === "custom" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-xs text-gray-700">Tùy chọn</span>
              </div>
              {dateMode === "custom" && (
                <div className="mt-1.5 space-y-1 pl-6">
                  {(["from", "to"] as const).map((type) => (
                    <div key={type} className="relative">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCal(openCal === type ? null : type);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white border rounded-md text-xs cursor-pointer hover:border-blue-300">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span
                          className={`${(type === "from" ? fromDate : toDate) ? "text-gray-700" : "text-gray-400"}`}>
                          {(type === "from" ? fromDate : toDate) ||
                            (type === "from" ? "Từ ngày" : "Đến ngày")}
                        </span>
                      </div>
                      {openCal === type && (
                        <div className="absolute z-50 top-full mt-1 left-0">
                          <MiniCalendar
                            value={type === "from" ? fromDate : toDate}
                            onChange={type === "from" ? setFromDate : setToDate}
                            onClose={() => setOpenCal(null)}
                            minDate={
                              type === "to" ? fromDate || undefined : undefined
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
