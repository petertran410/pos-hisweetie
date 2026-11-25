"use client";

import { RotateCcw } from "lucide-react";
import type { TimeRangeState } from "@/components/shared/TimeRangeFilter";
import { FilterMultiSelect, FilterSearchableSelect } from "@/components/ui/filters";
import { platformLabel } from "@/lib/chat/platforms";
import type { SmaxFilterOptions } from "@/lib/dashboard/smax/smaxDashboard.types";
import { TimePopover } from "@/components/reports/lead/LeadFilterBar";

export interface SmaxFilterState {
  timeRange: TimeRangeState;
  pagePids: string[];
  userId: string;
  branchIds: string[];
}

export const DEFAULT_SMAX_FILTERS: SmaxFilterState = {
  // Mặc định "Tháng này" như báo cáo Lead.
  timeRange: { dateMode: "preset", selectedPreset: "this_month", fromDate: "", toDate: "" },
  pagePids: [],
  userId: "",
  branchIds: [],
};

export const isDefaultSmaxFilters = (f: SmaxFilterState) =>
  JSON.stringify(f) === JSON.stringify(DEFAULT_SMAX_FILTERS);

export function SmaxFilterBar({
  value,
  onChange,
  options: opts,
  ownOnly,
}: {
  value: SmaxFilterState;
  onChange: (f: SmaxFilterState) => void;
  options: SmaxFilterOptions;
  /** Chỉ xem số liệu của mình → ẩn lọc nhân viên. */
  ownOnly: boolean;
}) {
  const set = (patch: Partial<SmaxFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="dt-panel p-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <TimePopover value={value.timeRange} onChange={(timeRange) => set({ timeRange })} />
        <div className="w-48">
          <FilterMultiSelect
            options={opts.channels.map((c) => ({
              value: c.pagePid,
              label: c.name,
              group: platformLabel(c.platform),
            }))}
            values={value.pagePids}
            onChange={(pagePids) => set({ pagePids })}
            placeholder="Kênh: Tất cả"
            searchPlaceholder="Tìm kênh..."
            multiLabel={(n) => `${n} kênh`}
          />
        </div>
        {!ownOnly && (
          <div className="w-44">
            <FilterSearchableSelect
              options={opts.staff.map((u) => ({ value: String(u.id), label: u.name }))}
              value={value.userId}
              onChange={(userId) => set({ userId })}
              placeholder="Nhân viên: Tất cả"
              searchPlaceholder="Tìm nhân viên..."
            />
          </div>
        )}
        <div className="w-44">
          <FilterMultiSelect
            options={opts.branches.map((b) => ({ value: String(b.id), label: b.name }))}
            values={value.branchIds}
            onChange={(branchIds) => set({ branchIds })}
            placeholder="Chi nhánh: Tất cả"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>
        <span className="text-[11.5px]" style={{ color: "var(--dt-text-muted)" }}>
          Chi nhánh chỉ áp dụng cho Độ phủ Zalo và Chat → Đơn.
        </span>
        <div className="flex-1" />
        {!isDefaultSmaxFilters(value) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SMAX_FILTERS)}
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
