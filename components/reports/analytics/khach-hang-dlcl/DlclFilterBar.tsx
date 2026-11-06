"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { DashSelect } from "@/components/dashboard/DashSelect";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import type {
  DlclFilters,
  DlclOptions,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { METRIC_OPTIONS } from "../analyticsFormat";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** Các slicer khách / hàng có thể tắt theo trang (vd trang có filter cố định). */
export type DlclSlicer =
  | "customerType"
  | "customerGroup"
  | "parent"
  | "region"
  | "productGroup"
  | "productType"
  | "brand"
  | "phase"
  | "product";

const ALL_SLICERS: DlclSlicer[] = [
  "customerType",
  "customerGroup",
  "parent",
  "region",
  "productGroup",
  "productType",
  "brand",
  "phase",
  "product",
];

interface Props {
  filters: DlclFilters;
  onChange: (f: DlclFilters) => void;
  options?: DlclOptions;
  /** Ẩn "Tính toán bởi" (trang không dùng switch_dynamics_metrics). */
  hideMetric?: boolean;
  /** Chọn nhiều năm (trang Xuất Data). */
  multiYear?: boolean;
  hide?: DlclSlicer[];
  /** Phần tử thêm ở hàng đầu (vd chọn cột đại lý). */
  extra?: ReactNode;
  /** Giá trị giữ nguyên khi "Xoá lọc". */
  keep?: (keyof DlclFilters)[];
  /** Hiện ở cuối hàng đầu (kỳ đang xem, đang tải…). */
  status?: ReactNode;
}

/** Thanh lọc các trang ĐLCL / Biên Thương Mại / Chi Tiết / Xuất Data (thay slicer Power BI). */
export function DlclFilterBar({
  filters,
  onChange,
  options,
  hideMetric,
  multiYear,
  hide = [],
  extra,
  keep = [],
  status,
}: Props) {
  const set = (patch: Partial<DlclFilters>) =>
    onChange({ ...filters, ...patch });
  const str = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v);
  const strOpts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: v }));
  const on = (s: DlclSlicer) => ALL_SLICERS.includes(s) && !hide.includes(s);

  const years = (options?.years ?? [filters.year]).slice().reverse();
  const hasExtra =
    !!filters.months?.length ||
    !!filters.customerType ||
    !!filters.customerGroupId ||
    !!filters.parentName ||
    !!filters.region ||
    !!filters.productGroup ||
    !!filters.productType ||
    !!filters.brand ||
    !!filters.productPhase ||
    !!filters.productName;

  const reset = () => {
    const next: DlclFilters = { year: filters.year };
    for (const k of [
      "metric",
      "axis",
      "columns",
      "years",
      ...keep,
    ] as (keyof DlclFilters)[]) {
      if (filters[k] !== undefined)
        (next as unknown as Record<string, unknown>)[k] = filters[k];
    }
    onChange(next);
  };

  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {multiYear ? (
          <div className="w-44">
            <FilterMultiSelect
              options={years.map((y) => ({
                value: String(y),
                label: `Năm ${y}`,
              }))}
              values={(filters.years?.length
                ? filters.years
                : [filters.year]
              ).map(String)}
              onChange={(vals) => {
                const ys = vals.map(Number).sort((a, b) => a - b);
                if (!ys.length) return;
                set({ years: ys, year: ys[ys.length - 1] });
              }}
              placeholder="Chọn năm"
              searchable={false}
              multiLabel={(n) => `${n} năm`}
            />
          </div>
        ) : (
          <DashSelect
            ariaLabel="Năm"
            options={years.map((y) => ({ key: String(y), label: `Năm ${y}` }))}
            value={String(filters.year)}
            onChange={(k) => set({ year: Number(k) })}
            size="md"
          />
        )}
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
        {!hideMetric && (
          <div className="dt-seg" title="Tính toán bởi">
            {METRIC_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                data-on={(filters.metric ?? "amount") === o.key}
                onClick={() => set({ metric: o.key })}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        {extra}
        <div className="flex-1" />
        {status}
        {hasExtra && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>

      <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        {on("customerType") && (
          <FilterSearchableSelect
            options={strOpts(options?.customerTypes)}
            value={str(filters.customerType)}
            onChange={(v) => set({ customerType: v || undefined })}
            placeholder="Nhóm khách: Tất cả"
          />
        )}
        {on("customerGroup") && (
          <FilterSearchableSelect
            options={(options?.customerGroups ?? []).map((g) => ({
              value: String(g.id),
              label: g.name,
            }))}
            value={str(filters.customerGroupId)}
            onChange={(v) =>
              set({ customerGroupId: v ? Number(v) : undefined })
            }
            placeholder="Nhóm đặc biệt: Tất cả"
          />
        )}
        {on("parent") && (
          <FilterSearchableSelect
            options={strOpts(options?.parentNames)}
            value={str(filters.parentName)}
            onChange={(v) => set({ parentName: v || undefined })}
            placeholder="Tên khách cha: Tất cả"
          />
        )}
        {on("region") && (
          <FilterSearchableSelect
            options={strOpts(options?.regions)}
            value={str(filters.region)}
            onChange={(v) => set({ region: v || undefined })}
            placeholder="Vùng miền: Tất cả"
          />
        )}
        {on("productGroup") && (
          <FilterSearchableSelect
            options={strOpts(options?.productGroups)}
            value={str(filters.productGroup)}
            onChange={(v) => set({ productGroup: v || undefined })}
            placeholder="Nhóm hàng: Tất cả"
          />
        )}
        {on("productType") && (
          <FilterSearchableSelect
            options={strOpts(options?.productTypes)}
            value={str(filters.productType)}
            onChange={(v) => set({ productType: v || undefined })}
            placeholder="Ngành hàng: Tất cả"
          />
        )}
        {on("brand") && (
          <FilterSearchableSelect
            options={strOpts(options?.brands)}
            value={str(filters.brand)}
            onChange={(v) => set({ brand: v || undefined })}
            placeholder="Thương hiệu: Tất cả"
          />
        )}
        {on("phase") && (
          <FilterSearchableSelect
            options={strOpts(options?.productPhases)}
            value={str(filters.productPhase)}
            onChange={(v) => set({ productPhase: v || undefined })}
            placeholder="Giai đoạn SP: Tất cả"
            searchable={false}
          />
        )}
        {on("product") && (
          <FilterSearchableSelect
            options={strOpts(options?.productNames)}
            value={str(filters.productName)}
            onChange={(v) => set({ productName: v || undefined })}
            placeholder="Tên sản phẩm: Tất cả"
          />
        )}
      </div>
    </div>
  );
}
