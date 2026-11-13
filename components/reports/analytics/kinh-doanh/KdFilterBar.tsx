"use client";

import { RotateCcw } from "lucide-react";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { KdFilters } from "@/lib/api/analytics-kinh-doanh";
import { useAnalyticsFilterOptions } from "@/lib/hooks/useAnalyticsReports";
import { useKdOptions } from "@/lib/hooks/useAnalyticsKinhDoanh";
import { METRIC_OPTIONS } from "../analyticsFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** Các slicer có thể bật trên từng trang (đúng slicer của trang Power BI). */
export type KdFilterKey =
  | "months"
  | "metric"
  | "saleTeam"
  | "customerGroup"
  | "customerType"
  | "productGroup"
  | "visualProductGroup"
  | "productType"
  | "brand"
  | "category"
  | "product"
  | "parent"
  | "region"
  | "specialGroup";

interface Props {
  filters: KdFilters;
  onChange: (f: KdFilters) => void;
  show: KdFilterKey[];
  /** Ghi chú nhỏ bên phải (vd phạm vi áp dụng của bộ lọc). */
  note?: string;
}

/** Slicer lấy danh sách từ /kinh-doanh/options (các slicer khác dùng filter-options chung). */
const KD_OPTION_KEYS: KdFilterKey[] = [
  "customerType",
  "specialGroup",
  "parent",
  "productType",
  "brand",
  "category",
  "product",
];

/** Thanh lọc các trang Kinh Doanh (thay slicer Power BI). */
export function KdFilterBar({ filters, onChange, show, note }: Props) {
  const on = (k: KdFilterKey) => show.includes(k);
  const { data: base } = useAnalyticsFilterOptions();
  // Chỉ tải danh sách Kinh Doanh khi trang có slicer cần tới (vd. Đối Thủ chỉ lọc tháng).
  const { data: kd } = useKdOptions(KD_OPTION_KEYS.some(on));
  const set = (patch: Partial<KdFilters>) => onChange({ ...filters, ...patch });
  const str = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v);
  const strOpts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: v }));

  const hasExtra =
    !!filters.months?.length ||
    !!filters.saleTeamId ||
    !!filters.customerGroupId ||
    !!filters.customerType ||
    !!filters.productGroup ||
    !!filters.visualProductGroup ||
    !!filters.productType ||
    !!filters.brand ||
    !!filters.category ||
    !!filters.productCode ||
    !!filters.parentName ||
    !!filters.region ||
    !!filters.specialGroup;

  const yearOptions = (base?.years ?? [filters.year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));

  const selects: { key: KdFilterKey; el: React.ReactNode }[] = [
    {
      key: "saleTeam",
      el: (
        <FilterSearchableSelect
          options={(base?.saleTeams ?? []).map((t) => ({
            value: String(t.id),
            label: t.name,
          }))}
          value={str(filters.saleTeamId)}
          onChange={(v) => set({ saleTeamId: v ? Number(v) : undefined })}
          placeholder="Nhóm bán: Tất cả"
        />
      ),
    },
    {
      key: "customerType",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.customerTypes)}
          value={str(filters.customerType)}
          onChange={(v) => set({ customerType: v || undefined })}
          placeholder="Nhóm khách: Tất cả"
        />
      ),
    },
    {
      key: "customerGroup",
      el: (
        <FilterSearchableSelect
          options={(base?.customerGroups ?? []).map((g) => ({
            value: String(g.id),
            label: g.name,
          }))}
          value={str(filters.customerGroupId)}
          onChange={(v) => set({ customerGroupId: v ? Number(v) : undefined })}
          placeholder="Nhóm đặc biệt: Tất cả"
        />
      ),
    },
    {
      key: "specialGroup",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.specialGroups)}
          value={str(filters.specialGroup)}
          onChange={(v) => set({ specialGroup: v || undefined })}
          placeholder="Nhóm khách đặc biệt: Tất cả"
        />
      ),
    },
    {
      key: "parent",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.parents)}
          value={str(filters.parentName)}
          onChange={(v) => set({ parentName: v || undefined })}
          placeholder="Tên khách cha: Tất cả"
        />
      ),
    },
    {
      key: "region",
      el: (
        <FilterSearchableSelect
          options={strOpts(base?.regions)}
          value={str(filters.region)}
          onChange={(v) => set({ region: v || undefined })}
          placeholder="Vùng miền: Tất cả"
        />
      ),
    },
    {
      key: "productGroup",
      el: (
        <FilterSearchableSelect
          options={strOpts(base?.productGroups)}
          value={str(filters.productGroup)}
          onChange={(v) => set({ productGroup: v || undefined })}
          placeholder="Nhóm hàng 2026: Tất cả"
        />
      ),
    },
    {
      key: "visualProductGroup",
      el: (
        <FilterSearchableSelect
          options={strOpts(base?.visualProductGroups)}
          value={str(filters.visualProductGroup)}
          onChange={(v) => set({ visualProductGroup: v || undefined })}
          placeholder="Nhóm hàng (sale): Tất cả"
        />
      ),
    },
    {
      key: "productType",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.productTypes)}
          value={str(filters.productType)}
          onChange={(v) => set({ productType: v || undefined })}
          placeholder="Loại hàng: Tất cả"
        />
      ),
    },
    {
      key: "brand",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.brands)}
          value={str(filters.brand)}
          onChange={(v) => set({ brand: v || undefined })}
          placeholder="Thương hiệu: Tất cả"
        />
      ),
    },
    {
      key: "category",
      el: (
        <FilterSearchableSelect
          options={strOpts(kd?.categories)}
          value={str(filters.category)}
          onChange={(v) => set({ category: v || undefined })}
          placeholder="Danh mục hàng: Tất cả"
        />
      ),
    },
    {
      key: "product",
      el: (
        <FilterSearchableSelect
          options={(kd?.products ?? []).map((p) => ({
            value: p.code,
            label: p.name,
          }))}
          value={str(filters.productCode)}
          onChange={(v) => set({ productCode: v || undefined })}
          placeholder="Tên sản phẩm: Tất cả"
        />
      ),
    },
  ];
  const visible = selects.filter((s) => on(s.key));

  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <AnalyticsSelect
          options={yearOptions}
          value={String(filters.year)}
          onChange={(k) => set({ year: Number(k) })}
          className="w-36"
        />
        {on("months") && (
          <div className="w-44">
            <FilterMultiSelect
              options={MONTH_OPTIONS}
              values={(filters.months ?? []).map(String)}
              onChange={(vals) =>
                set({ months: vals.map(Number).sort((a, b) => a - b) })
              }
              placeholder="Cả năm"
              multiLabel={(n) => `${n} tháng`}
            />
          </div>
        )}
        {on("metric") && (
          <div className="dt-seg">
            {METRIC_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                data-on={(filters.metric ?? "amount") === o.key}
                onClick={() => set({ metric: o.key as AnalyticsMetric })}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {note && (
          <span
            className="text-[12px]"
            style={{ color: "var(--dt-text-muted)" }}>
            {note}
          </span>
        )}
        {hasExtra && (
          <button
            type="button"
            onClick={() =>
              onChange({ year: filters.year, metric: filters.metric })
            }
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>
      {visible.length > 0 && (
        <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {visible.map((s) => (
            <div key={s.key}>{s.el}</div>
          ))}
        </div>
      )}
    </div>
  );
}
