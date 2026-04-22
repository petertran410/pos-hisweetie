"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { ChevronDown, Check, Calendar } from "lucide-react";

interface InventoryChecksSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

// ─── Mini Calendar ──────────────────────────────────────────────────────────
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

// ─── Main ───────────────────────────────────────────────────────────────────
export function InventoryChecksSidebar({
  onFiltersChange,
}: InventoryChecksSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();

  const [branchId, setBranchId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
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
    if (fromDate || toDate) n++;
    return n;
  }, [branchId, creatorId, fromDate, toDate]);

  // Debounce emit
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (creatorId) f.creatorId = parseInt(creatorId);
      if (fromDate) f.fromDate = fromDate;
      if (toDate) f.toDate = toDate;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, creatorId, fromDate, toDate]);

  const clearAll = () => {
    setBranchId("");
    setCreatorId("");
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
      {/* Header */}
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

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Chi nhánh
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="">Tất cả</option>
            {branchOptions.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Người kiểm ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Người kiểm
          </label>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="">Tất cả</option>
            {creatorOptions.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Thời gian ── */}
        <div ref={calRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời gian
          </label>
          <div className="space-y-2">
            {/* Từ ngày */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenCal(openCal === "from" ? null : "from")}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  openCal === "from"
                    ? "ring-1 ring-blue-500 border-blue-500"
                    : ""
                }`}>
                <span className={fromDate ? "text-gray-900" : "text-gray-400"}>
                  {fromDate
                    ? new Date(fromDate).toLocaleDateString("vi-VN")
                    : "Từ ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              {openCal === "from" && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <MiniCalendar
                    value={fromDate}
                    onChange={setFromDate}
                    onClose={() => setOpenCal(null)}
                  />
                </div>
              )}
            </div>

            {/* Đến ngày */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenCal(openCal === "to" ? null : "to")}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  openCal === "to" ? "ring-1 ring-blue-500 border-blue-500" : ""
                }`}>
                <span className={toDate ? "text-gray-900" : "text-gray-400"}>
                  {toDate
                    ? new Date(toDate).toLocaleDateString("vi-VN")
                    : "Đến ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              {openCal === "to" && (
                <div className="absolute top-full left-0 mt-1 z-50">
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
