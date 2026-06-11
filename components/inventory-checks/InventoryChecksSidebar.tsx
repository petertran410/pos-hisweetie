"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { ChevronDown, Calendar } from "lucide-react";
import { createPortal } from "react-dom";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";

interface InventoryChecksSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

// ─── Mini Calendar ────────────────────────────────────────────────
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
    <div
      className="bg-white border rounded-lg shadow-lg p-3 w-64"
      onMouseDown={(e) => e.stopPropagation()}>
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
              onMouseDown={(e) => e.stopPropagation()}
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
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
          Xóa
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            onChange(todayStr);
            onClose();
          }}
          className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export function InventoryChecksSidebar({
  onFiltersChange,
}: InventoryChecksSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { selectedBranch } = useBranchStore();

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(() =>
    selectedBranch ? [selectedBranch.id] : []
  );
  const [creatorId, setCreatorId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const fromBtnRef = useRef<HTMLButtonElement>(null);
  const toBtnRef = useRef<HTMLButtonElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [calPos, setCalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Close calendar on outside click — exclude calendar portal
  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fromBtnRef.current?.contains(target)) return;
      if (toBtnRef.current?.contains(target)) return;
      if (calRef.current?.contains(target)) return;
      setOpenCal(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

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
      setSelectedBranchIds((prev) =>
        prev.length === 1 ? (cur ? [cur] : []) : prev
      );
    }
  }, [selectedBranch?.id]);

  const openCalendar = (type: "from" | "to") => {
    if (openCal === type) {
      setOpenCal(null);
      return;
    }
    const ref = type === "from" ? fromBtnRef : toBtnRef;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCalPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpenCal(type);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (creatorId) n++;
    if (fromDate || toDate) n++;
    return n;
  }, [selectedBranchIds, creatorId, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (selectedBranchIds.length > 0)
        f.branchIds = selectedBranchIds.join(",");
      if (creatorId) f.creatorId = parseInt(creatorId);
      if (fromDate) f.fromDate = fromDate;
      if (toDate) f.toDate = toDate;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedBranchIds, creatorId, fromDate, toDate]);

  const clearAll = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setCreatorId("");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  const branchOptions = useMemo(
    () =>
      (branches || [])
        .filter((b: any) => b.isActive)
        .map((b: any) => ({ value: String(b.id), label: b.name })),
    [branches]
  );
  const creatorOptions = useMemo(
    () =>
      (users || []).map((u: any) => ({ value: String(u.id), label: u.name })),
    [users]
  );

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col relative z-20">
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

      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {/* ── Chi nhánh (multi-select dropdown) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branchOptions}
            values={selectedBranchIds.map(String)}
            onChange={(vals) => setSelectedBranchIds(vals.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Người kiểm (searchable dropdown) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Người kiểm
          </label>
          <FilterSearchableSelect
            options={creatorOptions}
            value={creatorId}
            placeholder="Tất cả"
            searchPlaceholder="Tìm người kiểm..."
            onChange={setCreatorId}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Thời gian ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Thời gian
          </label>
          <div className="space-y-2">
            <div className="relative">
              <button
                ref={fromBtnRef}
                type="button"
                onClick={() => openCalendar("from")}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  openCal === "from"
                    ? "ring-1 ring-brand border-brand"
                    : "hover:border-gray-400"
                }`}>
                <span className={fromDate ? "text-gray-900" : "text-gray-400"}>
                  {fromDate
                    ? new Date(fromDate).toLocaleDateString("vi-VN")
                    : "Từ ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="relative">
              <button
                ref={toBtnRef}
                type="button"
                onClick={() => openCalendar("to")}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  openCal === "to"
                    ? "ring-1 ring-brand border-brand"
                    : "hover:border-gray-400"
                }`}>
                <span className={toDate ? "text-gray-900" : "text-gray-400"}>
                  {toDate
                    ? new Date(toDate).toLocaleDateString("vi-VN")
                    : "Đến ngày"}
                </span>
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar portal */}
      {openCal &&
        calPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={calRef}
            style={{
              position: "fixed",
              top: calPos.top,
              left: calPos.left,
              zIndex: 9999,
            }}>
            {openCal === "from" && (
              <MiniCalendar
                value={fromDate}
                onChange={setFromDate}
                onClose={() => setOpenCal(null)}
              />
            )}
            {openCal === "to" && (
              <MiniCalendar
                value={toDate}
                onChange={setToDate}
                onClose={() => setOpenCal(null)}
                minDate={fromDate}
              />
            )}
          </div>,
          document.body
        )}
    </aside>
  );
}
