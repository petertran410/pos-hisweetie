"use client";

import { useEffect, useState } from "react";
import { Calendar, RotateCcw } from "lucide-react";
import {
  PRESET_LABELS,
  TimeRangeFilter,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { FilterMultiSelect, FilterSearchableSelect } from "@/components/ui/filters";
import { fmtDay } from "@/components/dashboard/DashSelect";
import type { LeadFilterOptions } from "@/lib/dashboard/lead/leadDashboard.types";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  options,
} from "@/lib/leads/constants";

export interface LeadFilterState {
  timeRange: TimeRangeState;
  sources: string[];
  categories: string[];
  cskhUserId: string;
  salePicId: string;
}

export const DEFAULT_LEAD_FILTERS: LeadFilterState = {
  // Mặc định "Tháng này" như trang Bán hàng.
  timeRange: { dateMode: "preset", selectedPreset: "this_month", fromDate: "", toDate: "" },
  sources: [],
  categories: [],
  cskhUserId: "",
  salePicId: "",
};

export const isDefaultLeadFilters = (f: LeadFilterState) =>
  JSON.stringify(f) === JSON.stringify(DEFAULT_LEAD_FILTERS);

function timeLabel(t: TimeRangeState) {
  if (t.dateMode === "custom")
    return t.fromDate && t.toDate
      ? `${fmtDay(t.fromDate)} – ${fmtDay(t.toDate)}`
      : "Tuỳ chỉnh…";
  return PRESET_LABELS[t.selectedPreset] ?? "Chọn thời gian";
}

/** Nút chọn thời gian: tái dùng nguyên TimeRangeFilter của trang Bán hàng, đặt trong popover. */
function TimePopover({
  value,
  onChange,
}: {
  value: TimeRangeState;
  onChange: (t: TimeRangeState) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="dt-select inline-flex items-center gap-2 whitespace-nowrap"
        style={open ? { borderColor: "var(--dt-primary)" } : undefined}>
        <Calendar className="w-4 h-4" style={{ color: "var(--dt-text-muted)" }} />
        {timeLabel(value)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Chọn khoảng thời gian"
            className="absolute left-0 top-full mt-2 z-40 w-[270px] bg-white border rounded-xl shadow-xl p-3"
            style={{ borderColor: "var(--dt-border)" }}>
            <TimeRangeFilter label="Thời gian" value={value} onChange={onChange} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-[13px] font-semibold py-2 rounded-md text-white"
              style={{ background: "var(--dt-primary)" }}>
              Xong
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function LeadFilterBar({
  value,
  onChange,
  options: opts,
}: {
  value: LeadFilterState;
  onChange: (f: LeadFilterState) => void;
  options: LeadFilterOptions;
}) {
  const set = (patch: Partial<LeadFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="dt-panel p-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <TimePopover value={value.timeRange} onChange={(timeRange) => set({ timeRange })} />
        <div className="w-44">
          <FilterMultiSelect
            options={options(LEAD_SOURCE_LABEL)}
            values={value.sources}
            onChange={(sources) => set({ sources })}
            placeholder="Nguồn: Tất cả"
            searchable={false}
            multiLabel={(n) => `${n} nguồn`}
          />
        </div>
        <div className="w-44">
          <FilterMultiSelect
            options={options(LEAD_CATEGORY_LABEL)}
            values={value.categories}
            onChange={(categories) => set({ categories })}
            placeholder="Phân loại: Tất cả"
            searchable={false}
            multiLabel={(n) => `${n} phân loại`}
          />
        </div>
        <div className="w-44">
          <FilterSearchableSelect
            options={opts.cskh.map((u) => ({ value: String(u.id), label: u.name }))}
            value={value.cskhUserId}
            onChange={(cskhUserId) => set({ cskhUserId })}
            placeholder="CSKH: Tất cả"
            searchPlaceholder="Tìm CSKH..."
          />
        </div>
        <div className="w-44">
          <FilterSearchableSelect
            options={opts.salePics.map((u) => ({ value: String(u.id), label: u.name }))}
            value={value.salePicId}
            onChange={(salePicId) => set({ salePicId })}
            placeholder="Sale PIC: Tất cả"
            searchPlaceholder="Tìm Sale PIC..."
          />
        </div>
        <div className="flex-1" />
        {!isDefaultLeadFilters(value) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_LEAD_FILTERS)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>
    </div>
  );
}
