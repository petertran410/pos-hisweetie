"use client";

import { RotateCcw } from "lucide-react";
import { DashSelect } from "@/components/dashboard/DashSelect";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import type {
  AnalyticsBusinessFilters,
  AnalyticsFilterOptions,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";
import { METRIC_OPTIONS } from "./analyticsFormat";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

interface Props {
  filters: AnalyticsBusinessFilters;
  onChange: (f: AnalyticsBusinessFilters) => void;
  metric: AnalyticsMetric;
  onMetricChange: (m: AnalyticsMetric) => void;
  options?: AnalyticsFilterOptions;
}

/** Thanh lọc chung của trang (thay các slicer Power BI). */
export function AnalyticsFilterBar({
  filters,
  onChange,
  metric,
  onMetricChange,
  options,
}: Props) {
  const set = (patch: Partial<AnalyticsBusinessFilters>) =>
    onChange({ ...filters, ...patch });
  const str = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v);
  const strOpts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: v }));

  const hasExtra =
    !!filters.saleTeamId ||
    !!filters.customerGroupId ||
    !!filters.productGroup ||
    !!filters.visualProductGroup ||
    !!filters.parentName ||
    !!filters.region ||
    !!filters.months?.length;

  const yearOptions = (options?.years ?? [filters.year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));

  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <DashSelect
          ariaLabel="Năm"
          options={yearOptions}
          value={String(filters.year)}
          onChange={(k) => set({ year: Number(k) })}
          size="md"
        />
        <div className="w-44">
          <FilterMultiSelect
            options={MONTH_OPTIONS}
            values={(filters.months ?? []).map(String)}
            onChange={(vals) =>
              set({ months: vals.map(Number).sort((a, b) => a - b) })
            }
            placeholder="Cả năm"
            searchable={false}
            multiLabel={(n) => `${n} tháng`}
          />
        </div>
        <div className="dt-seg">
          {METRIC_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              data-on={metric === o.key}
              onClick={() => onMetricChange(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {hasExtra && (
          <button
            type="button"
            onClick={() => onChange({ year: filters.year, axis: filters.axis })}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>

      <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <FilterSearchableSelect
          options={(options?.saleTeams ?? []).map((t) => ({
            value: String(t.id),
            label: t.name,
          }))}
          value={str(filters.saleTeamId)}
          onChange={(v) => set({ saleTeamId: v ? Number(v) : undefined })}
          placeholder="Nhóm bán: Tất cả"
        />
        <FilterSearchableSelect
          options={(options?.customerGroups ?? []).map((g) => ({
            value: String(g.id),
            label: g.name,
          }))}
          value={str(filters.customerGroupId)}
          onChange={(v) => set({ customerGroupId: v ? Number(v) : undefined })}
          placeholder="Nhóm khách: Tất cả"
        />
        <FilterSearchableSelect
          options={strOpts(options?.productGroups)}
          value={str(filters.productGroup)}
          onChange={(v) => set({ productGroup: v || undefined })}
          placeholder="Nhóm hàng 2026: Tất cả"
        />
        <FilterSearchableSelect
          options={strOpts(options?.visualProductGroups)}
          value={str(filters.visualProductGroup)}
          onChange={(v) => set({ visualProductGroup: v || undefined })}
          placeholder="Nhóm hàng (sale): Tất cả"
        />
        <FilterSearchableSelect
          options={strOpts(options?.vipParents)}
          value={str(filters.parentName)}
          onChange={(v) => set({ parentName: v || undefined })}
          placeholder="Khách VIP: Tất cả"
        />
        <FilterSearchableSelect
          options={strOpts(options?.regions)}
          value={str(filters.region)}
          onChange={(v) => set({ region: v || undefined })}
          placeholder="Vùng: Tất cả"
        />
      </div>
    </div>
  );
}
