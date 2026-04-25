"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { ChevronDown, Check, Calendar } from "lucide-react";

interface StockAuditsSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  { value: "1", label: "Phiếu tạm", color: "bg-yellow-100 text-yellow-700" },
  { value: "2", label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  { value: "3", label: "Đã hủy", color: "bg-red-100 text-red-700" },
];

// ─── Mini Calendar (copy từ InventoryChecksSidebar) ──────────────
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
  const todayObj = new Date();
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(value).getMonth() : todayObj.getMonth()
  );
  const [viewYear, setViewYear] = useState(
    value ? new Date(value).getFullYear() : todayObj.getFullYear()
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = todayObj.toISOString().split("T")[0];

  const prev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 w-64 z-50">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-sm font-medium">
          Tháng {viewMonth + 1}/{viewYear}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 mb-1">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSel = ds === value;
          const isToday = ds === todayStr;
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
            onChange(todayStr);
            onClose();
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

// ─── Dropdown Select ─────────────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white hover:border-blue-400 transition-colors">
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected?.label || placeholder || "Chọn..."}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(value === opt.value ? "" : opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                  opt.value === value
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span className="truncate">{opt.label}</span>
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export function StockAuditsSidebar({
  onFiltersChange,
}: StockAuditsSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();

  const [branchId, setBranchId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setOpenCal(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchId) n++;
    if (creatorId) n++;
    if (status) n++;
    if (fromDate || toDate) n++;
    return n;
  }, [branchId, creatorId, status, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (creatorId) f.creatorId = parseInt(creatorId);
      if (status) f.status = parseInt(status);
      if (fromDate) f.fromDate = fromDate;
      if (toDate) f.toDate = toDate;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, creatorId, status, fromDate, toDate]);

  const clearAll = () => {
    setBranchId("");
    setCreatorId("");
    setStatus("");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b: any) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branches]
  );
  const creatorOptions = useMemo(
    () =>
      (users || []).map((u: any) => ({ value: String(u.id), label: u.name })),
    [users]
  );

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto h-full">
        {/* Trạng thái */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(status === opt.value ? "" : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  status === opt.value
                    ? opt.color + " ring-2 ring-offset-1 ring-blue-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <FilterSelect
          label="Chi nhánh"
          value={branchId}
          onChange={setBranchId}
          options={branchOptions}
          placeholder="Tất cả"
        />
        <FilterSelect
          label="Người kiểm"
          value={creatorId}
          onChange={setCreatorId}
          options={creatorOptions}
          placeholder="Tất cả"
        />

        {/* Date range */}
        <div ref={calRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời gian kiểm
          </label>
          <div className="space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenCal(openCal === "from" ? null : "from")}
                className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white hover:border-blue-400">
                <span className={fromDate ? "text-gray-900" : "text-gray-400"}>
                  {fromDate || "Từ ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              {openCal === "from" && (
                <div className="absolute top-full left-0 mt-1 z-30">
                  <MiniCalendar
                    value={fromDate}
                    onChange={setFromDate}
                    onClose={() => setOpenCal(null)}
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenCal(openCal === "to" ? null : "to")}
                className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white hover:border-blue-400">
                <span className={toDate ? "text-gray-900" : "text-gray-400"}>
                  {toDate || "Đến ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              {openCal === "to" && (
                <div className="absolute top-full left-0 mt-1 z-30">
                  <MiniCalendar
                    value={toDate}
                    onChange={setToDate}
                    onClose={() => setOpenCal(null)}
                    minDate={fromDate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
