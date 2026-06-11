"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Calendar } from "lucide-react";
import { MiniCalendar } from "@/components/shared/MiniCalendar";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useReportAccess,
  REPORT_VIEWTYPE_PERMISSION,
} from "@/lib/permissions/reportPermissions";
import { EodReportFilters, EodViewType } from "@/lib/api/reports";

interface Props {
  viewType: EodViewType;
  onViewTypeChange: (v: EodViewType) => void;
  onFiltersChange: (filters: EodReportFilters) => void;
}

const VIEW_TYPES: { value: EodViewType; label: string }[] = [
  { value: "Synthetic", label: "Tổng hợp cuối ngày" },
  { value: "Document", label: "Chứng từ (hóa đơn)" },
  { value: "CashFlow", label: "Thu chi tiền" },
  { value: "Product", label: "Hàng bán trong ngày" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function EodReportSidebar({
  viewType,
  onViewTypeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { has } = useReportAccess();
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [openCal, setOpenCal] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const visibleViewTypes = useMemo(
    () =>
      VIEW_TYPES.filter((v) =>
        has(REPORT_VIEWTYPE_PERMISSION["cuoi-ngay"][v.value])
      ),
    [has]
  );

  useEffect(() => {
    if (
      visibleViewTypes.length > 0 &&
      !visibleViewTypes.some((v) => v.value === viewType)
    ) {
      onViewTypeChange(visibleViewTypes[0].value);
    }
  }, [visibleViewTypes, viewType, onViewTypeChange]);

  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setOpenCal(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

  useEffect(() => {
    const t = setTimeout(() => {
      const f: EodReportFilters = { viewType, date };
      if (branchId) f.branchId = parseInt(branchId);
      onFiltersChange(f);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType, date, branchId]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Cuối ngày</h2>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Loại báo cáo
          </label>
          <div className="space-y-1">
            {visibleViewTypes.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => onViewTypeChange(v.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewType === v.value
                    ? "bg-brand text-white font-medium shadow-sm"
                    : "text-gray-700 hover:bg-brand-soft border border-gray-200"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Ngày ── */}
        <div ref={calRef}>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Ngày
          </label>
          <button
            type="button"
            onClick={() => setOpenCal((o) => !o)}
            className="w-full flex items-center justify-between px-2 py-1.5 border rounded-lg text-sm border-brand bg-brand-soft text-gray-800">
            <span>
              {new Date(date + "T00:00:00").toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
            <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
          </button>
          {openCal && (
            <MiniCalendar
              value={date}
              onChange={(d) => d && setDate(d)}
              onClose={() => setOpenCal(false)}
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
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
            <option value="">Tất cả</option>
            {(branches || [])
              .filter((b: { isActive: boolean }) => b.isActive)
              .map((b: { id: number; name: string }) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
