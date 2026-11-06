"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { DashSelect } from "@/components/dashboard/DashSelect";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import type {
  QtFilterOptions,
  QtFilters,
  QtMetric,
} from "@/lib/api/analytics-quan-tri";
import { QT_METRIC_OPTIONS } from "./qtFormat";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** Các slicer của report Power BI "Báo Cáo Quản Trị". */
export type QtSlicer =
  | "team" // dim_user[group_sale_name]
  | "customerType" // dim_customers[customer_group]
  | "vipWholesale" // dim_customers[parent_name]: Khách buôn VIP
  | "vipParent" // dim_customers[parent_name]: Khách buôn + chuỗi VIP
  | "parent" // dim_customers[parent_name]
  | "groupSource" // dim_sale_channel[group_source]
  | "productGroup" // dim_product[product_group_2026]
  | "productType"
  | "category"
  | "origin"
  | "brand"
  | "product"; // dim_product[name]

/** Các field chỉ thuộc bộ lọc phụ (nút "Xoá lọc"). */
const EXTRA_KEYS: (keyof QtFilters)[] = [
  "months",
  "saleTeamId",
  "customerType",
  "parentName",
  "groupSource",
  "productGroup",
  "productType",
  "category",
  "origin",
  "brand",
  "productCode",
];

interface Props {
  filters: QtFilters;
  onChange: (f: QtFilters) => void;
  options?: QtFilterOptions;
  slicers: QtSlicer[];
  /** Các lựa chọn view_by (bỏ trống = không hiện). */
  metrics?: QtMetric[];
  /** Nội dung thêm ở hàng đầu (vd nút chuyển bookmark). */
  extra?: ReactNode;
}

/** Thanh lọc của các trang Quản Trị (thay slicer Power BI). */
export function QtFilterBar({
  filters,
  onChange,
  options,
  slicers,
  metrics,
  extra,
}: Props) {
  const set = (patch: Partial<QtFilters>) => onChange({ ...filters, ...patch });
  const str = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v);
  const opts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: v }));
  const hasExtra = EXTRA_KEYS.some((k) => {
    const v = filters[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "";
  });
  const yearOptions = (options?.years ?? [filters.year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));

  const text = (
    key: keyof QtFilters,
    list: string[] | undefined,
    placeholder: string,
  ) => (
    <FilterSearchableSelect
      key={key}
      options={opts(list)}
      value={str(filters[key] as string | undefined)}
      onChange={(v) => set({ [key]: v || undefined } as Partial<QtFilters>)}
      placeholder={placeholder}
    />
  );

  const render = (s: QtSlicer) => {
    switch (s) {
      case "team":
        return (
          <FilterSearchableSelect
            key={s}
            options={(options?.saleTeams ?? []).map((t) => ({
              value: String(t.id),
              label: t.name,
            }))}
            value={str(filters.saleTeamId)}
            onChange={(v) =>
              set({ saleTeamId: v === "" ? undefined : Number(v) })
            }
            placeholder="Nhóm bán: Tất cả"
          />
        );
      case "customerType":
        return text(
          "customerType",
          options?.customerTypes,
          "Nhóm khách: Tất cả",
        );
      case "vipWholesale":
        return text(
          "parentName",
          options?.vipWholesaleParents,
          "Khách buôn VIP: Tất cả",
        );
      case "vipParent":
        return text("parentName", options?.vipParents, "Khách VIP: Tất cả");
      case "parent":
        return text("parentName", options?.parents, "Khách cha: Tất cả");
      case "groupSource":
        return text("groupSource", options?.groupSources, "Nguồn bán: Tất cả");
      case "productGroup":
        return text(
          "productGroup",
          options?.productGroups,
          "Nhóm hàng 2026: Tất cả",
        );
      case "productType":
        return text("productType", options?.productTypes, "Ngành hàng: Tất cả");
      case "category":
        return text("category", options?.categories, "Danh mục: Tất cả");
      case "origin":
        return text("origin", options?.origins, "Nguồn gốc: Tất cả");
      case "brand":
        return text("brand", options?.brands, "Thương hiệu: Tất cả");
      case "product":
        return (
          <FilterSearchableSelect
            key={s}
            options={(options?.products ?? [])
              .filter(
                (p) =>
                  (!filters.category || p.category === filters.category) &&
                  (!filters.brand || p.brand === filters.brand),
              )
              .map((p) => ({ value: p.code, label: p.name }))}
            value={str(filters.productCode)}
            onChange={(v) => set({ productCode: v || undefined })}
            placeholder="Sản phẩm: Tất cả"
          />
        );
    }
  };

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
        {metrics && metrics.length > 0 && (
          <div className="dt-seg flex-wrap">
            {QT_METRIC_OPTIONS.filter((o) => metrics.includes(o.key)).map(
              (o) => (
                <button
                  key={o.key}
                  type="button"
                  data-on={(filters.metric ?? "amount") === o.key}
                  onClick={() => set({ metric: o.key })}>
                  {o.label}
                </button>
              ),
            )}
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
                axis: filters.axis,
                metric: filters.metric,
              })
            }
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>
      {slicers.length > 0 && (
        <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {slicers.map(render)}
        </div>
      )}
    </div>
  );
}
