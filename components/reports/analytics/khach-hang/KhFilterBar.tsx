"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type {
  KhFilterOptions,
  KhFilters,
} from "@/lib/api/analytics-khach-hang";
import { METRIC_OPTIONS } from "../analyticsFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

interface Props {
  filters: KhFilters;
  onChange: (f: KhFilters) => void;
  options?: KhFilterOptions;
  /** Tính toán bởi (view_by). Bỏ trống = trang không có slicer này. */
  metric?: AnalyticsMetric;
  onMetricChange?: (m: AnalyticsMetric) => void;
  /** Trang cần đúng 1 tháng (SELECTEDVALUE(dim_date[MonthStartDate])). */
  singleMonth?: boolean;
  /** Ẩn các slicer khách / hàng (trang Demand). */
  hideCustomer?: boolean;
  hideProduct?: boolean;
  /** Điều khiển riêng của trang (vd "Chọn Tuần"), đặt ở hàng đầu. */
  extra?: ReactNode;
}

/** Thanh lọc của báo cáo Khách Hàng (thay các slicer Power BI ở cột trái). */
export function KhFilterBar({
  filters,
  onChange,
  options,
  metric,
  onMetricChange,
  singleMonth = false,
  hideCustomer = false,
  hideProduct = false,
  extra,
}: Props) {
  const set = (patch: Partial<KhFilters>) => onChange({ ...filters, ...patch });
  const str = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v);
  const strOpts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: v }));

  const hasExtra =
    !!filters.customerType ||
    !!filters.customerGroupId ||
    !!filters.customerName ||
    !!filters.region ||
    !!filters.productGroup ||
    !!filters.productType ||
    !!filters.brand ||
    !!filters.productPhase ||
    !!filters.productCode ||
    (!singleMonth && !!filters.months?.length);

  const yearOptions = (options?.years ?? [filters.year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));

  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <AnalyticsSelect
          options={yearOptions}
          value={String(filters.year)}
          onChange={(k) => set({ year: Number(k) })}
          className="w-36"
        />
        <div className="w-44">
          {singleMonth ? (
            <FilterSearchableSelect
              options={MONTH_OPTIONS}
              value={str(filters.months?.[0])}
              onChange={(v) => v && set({ months: [Number(v)] })}
              allowDeselect={false}
              showClearOption={false}
              placeholder="Chọn tháng"
            />
          ) : (
            <FilterMultiSelect
              options={MONTH_OPTIONS}
              values={(filters.months ?? []).map(String)}
              onChange={(vals) =>
                set({ months: vals.map(Number).sort((a, b) => a - b) })
              }
              placeholder="Cả năm"
              multiLabel={(n) => `${n} tháng`}
            />
          )}
        </div>
        {metric && onMetricChange && (
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
        )}
        {extra}
        <div className="flex-1" />
        {hasExtra && (
          <button
            type="button"
            onClick={() =>
              onChange({
                year: filters.year,
                months: singleMonth ? filters.months : undefined,
              })
            }
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>

      {(!hideCustomer || !hideProduct) && (
        <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {!hideCustomer && (
            <>
              <FilterSearchableSelect
                options={strOpts(options?.customerTypes)}
                value={str(filters.customerType)}
                onChange={(v) => set({ customerType: v || undefined })}
                placeholder="Nhóm khách: Tất cả"
              />
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
              <FilterSearchableSelect
                options={strOpts(options?.customerNames)}
                value={str(filters.customerName)}
                onChange={(v) => set({ customerName: v || undefined })}
                placeholder="Tên khách: Tất cả"
              />
              <FilterSearchableSelect
                options={strOpts(options?.regions)}
                value={str(filters.region)}
                onChange={(v) => set({ region: v || undefined })}
                placeholder="Vùng miền: Tất cả"
              />
            </>
          )}
          {!hideProduct && (
            <>
              <FilterSearchableSelect
                options={strOpts(options?.productGroups)}
                value={str(filters.productGroup)}
                onChange={(v) => set({ productGroup: v || undefined })}
                placeholder="Nhóm hàng 2026: Tất cả"
              />
              <FilterSearchableSelect
                options={strOpts(options?.productTypes)}
                value={str(filters.productType)}
                onChange={(v) => set({ productType: v || undefined })}
                placeholder="Ngành hàng: Tất cả"
              />
              <FilterSearchableSelect
                options={strOpts(options?.brands)}
                value={str(filters.brand)}
                onChange={(v) => set({ brand: v || undefined })}
                placeholder="Thương hiệu: Tất cả"
              />
              <FilterSearchableSelect
                options={strOpts(options?.productPhases)}
                value={str(filters.productPhase)}
                onChange={(v) => set({ productPhase: v || undefined })}
                placeholder="Giai đoạn SP mới: Tất cả"
              />
              <FilterSearchableSelect
                options={(options?.products ?? []).map((p) => ({
                  value: p.code,
                  label: p.name,
                }))}
                value={str(filters.productCode)}
                onChange={(v) => set({ productCode: v || undefined })}
                placeholder="Sản phẩm: Tất cả"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
