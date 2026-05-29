"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { ChevronDown, Calendar, X, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";

interface InventoryChecksSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

// ─── SearchableDropdown ───────────────────────────────────────────
function SearchableDropdown({
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
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setOpen((prev) => !prev);
            setSearch("");
          }
        }}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <span
          className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="px-2 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                Không tìm thấy
              </div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value === value ? "" : opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                    opt.value === value
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                  {opt.label}
                  {opt.value === value && (
                    <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
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

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
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
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!branchDropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(e.target as Node)
      )
        setBranchDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [branchDropdownOpen]);

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
    setSelectedBranchIds([]);
    setCreatorId("");
    setFromDate("");
    setToDate("");
    onFiltersChange({});
  };

  const activeBranches = useMemo(
    () => (branches || []).filter((b: any) => b.isActive),
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
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
          <div ref={branchDropdownRef} className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setBranchDropdownOpen((prev) => !prev)}
              onKeyDown={(e) =>
                e.key === "Enter" && setBranchDropdownOpen((prev) => !prev)
              }
              className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
                branchDropdownOpen
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "hover:border-gray-400"
              } bg-white`}>
              <span
                className={
                  selectedBranchIds.length > 0
                    ? "text-gray-800 truncate"
                    : "text-gray-400"
                }>
                {selectedBranchIds.length === 0
                  ? "Tất cả chi nhánh"
                  : selectedBranchIds.length === activeBranches.length
                    ? "Tất cả chi nhánh"
                    : `${selectedBranchIds.length} chi nhánh`}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {selectedBranchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBranchIds([]);
                    }}
                    className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
                    <X className="w-3 h-3" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${branchDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {branchDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {/* Chọn tất cả */}
                <label className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={
                      activeBranches.length > 0 &&
                      selectedBranchIds.length === activeBranches.length
                    }
                    onChange={(e) => {
                      setSelectedBranchIds(
                        e.target.checked
                          ? activeBranches.map((b: any) => b.id)
                          : []
                      );
                    }}
                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs font-medium text-gray-600">
                    Tất cả chi nhánh
                  </span>
                </label>

                {/* Danh sách chi nhánh */}
                <div className="max-h-52 overflow-y-auto">
                  {activeBranches.map((branch: any) => (
                    <label
                      key={branch.id}
                      className="flex items-center gap-2.5 px-3 py-2 border-t border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(branch.id)}
                        onChange={(e) =>
                          setSelectedBranchIds((prev) =>
                            e.target.checked
                              ? [...prev, branch.id]
                              : prev.filter((id) => id !== branch.id)
                          )
                        }
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700">
                        {branch.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Người kiểm (searchable dropdown) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Người kiểm
          </label>
          <SearchableDropdown
            options={creatorOptions}
            value={creatorId}
            placeholder="Tất cả"
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
                    ? "ring-1 ring-blue-500 border-blue-500"
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
                    ? "ring-1 ring-blue-500 border-blue-500"
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
