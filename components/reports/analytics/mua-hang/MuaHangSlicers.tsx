"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import type {
  MuaHangDemandFilters,
  MuaHangFilterOptions,
} from "@/lib/api/analytics-mua-hang";
import { optionLabel } from "./muaHangFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** Slicer nào hiện trên trang (theo trang Power BI tương ứng). */
export interface SlicerSet {
  period?: boolean; // Năm + Tháng
  branches?: "warehouses" | "all";
  productTypes?: boolean;
  brands?: boolean;
  visualGroups?: boolean;
  groups2026?: boolean;
  categories?: boolean;
  products?: boolean;
  customers?: boolean;
}

type Filters = MuaHangDemandFilters;
type ArrKey =
  | "branches"
  | "productTypes"
  | "brands"
  | "visualGroups"
  | "groups2026"
  | "categories"
  | "productCodes";

/** Thanh slicer chung của Chuyển Kho / Thu Mua (thay các slicer Power BI). */
export function MuaHangSlicers<F extends Filters>({
  show,
  filters,
  onChange,
  options,
  defaultFilters,
  right,
  note,
}: {
  show: SlicerSet;
  filters: F;
  onChange: (f: F) => void;
  options?: MuaHangFilterOptions;
  defaultFilters: F;
  right?: ReactNode;
  note?: ReactNode;
}) {
  const set = (patch: Partial<F>) => onChange({ ...filters, ...patch });
  const blank = options?.blank;
  const strOpts = (list: string[] = []) =>
    list.map((v) => ({ value: v, label: optionLabel(v, blank) }));

  const multi = (
    key: ArrKey,
    list: { value: string; label: string }[],
    placeholder: string,
  ) => (
    <FilterMultiSelect
      key={key}
      options={list}
      values={filters[key] ?? []}
      onChange={(vals) =>
        set({ [key]: vals.length ? vals : undefined } as Partial<F>)
      }
      placeholder={placeholder}
      multiLabel={(n) => `${placeholder.split(":")[0]}: ${n} mục`}
    />
  );

  const hasExtra =
    JSON.stringify({ ...filters, trendLevel: undefined }) !==
    JSON.stringify({ ...defaultFilters, trendLevel: undefined });

  const yearOptions = [
    { key: "all", label: "Tất cả năm" },
    ...(options?.years ?? [])
      .slice()
      .reverse()
      .map((y) => ({ key: String(y), label: `Năm ${y}` })),
  ];

  const slicers: ReactNode[] = [];
  if (show.branches)
    slicers.push(
      multi(
        "branches",
        strOpts(
          show.branches === "warehouses"
            ? options?.warehouses
            : options?.branches,
        ),
        "Kho: Tất cả",
      ),
    );
  if (show.productTypes)
    slicers.push(
      multi(
        "productTypes",
        strOpts(options?.productTypes),
        "Loại hàng: Tất cả",
      ),
    );
  if (show.brands)
    slicers.push(
      multi("brands", strOpts(options?.brands), "Thương hiệu: Tất cả"),
    );
  if (show.visualGroups)
    slicers.push(
      multi(
        "visualGroups",
        strOpts(options?.visualGroups),
        "Nhóm hàng: Tất cả",
      ),
    );
  if (show.groups2026)
    slicers.push(
      multi(
        "groups2026",
        strOpts(options?.groups2026),
        "Nhóm hàng 2026: Tất cả",
      ),
    );
  if (show.categories)
    slicers.push(
      multi("categories", strOpts(options?.categories), "Danh mục: Tất cả"),
    );
  if (show.products)
    slicers.push(
      multi(
        "productCodes",
        (options?.products ?? []).map((p) => ({
          value: p.code,
          label: `${p.name} (${p.code})`,
        })),
        "Tên hàng: Tất cả",
      ),
    );
  if (show.customers)
    slicers.push(
      <FilterMultiSelect
        key="customers"
        options={(options?.demandCustomers ?? []).map((c) => ({
          value: String(c.id),
          label: `${c.name} (${c.code})`,
        }))}
        values={(filters.customerIds ?? []).map(String)}
        onChange={(vals) =>
          set({
            customerIds: vals.length ? vals.map(Number) : undefined,
          } as Partial<F>)
        }
        placeholder="Khách hàng: Tất cả"
        multiLabel={(n) => `Khách hàng: ${n} mục`}
      />,
    );

  return (
    <div className="dt-panel p-4 space-y-3">
      {(show.period || right || hasExtra) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {show.period && (
            <>
              <AnalyticsSelect
                options={yearOptions}
                value={filters.year ? String(filters.year) : "all"}
                onChange={(k) =>
                  set({
                    year: k === "all" ? undefined : Number(k),
                  } as Partial<F>)
                }
                className="w-36"
              />
              <div className="w-44">
                <FilterMultiSelect
                  options={MONTH_OPTIONS}
                  values={(filters.months ?? []).map(String)}
                  onChange={(vals) =>
                    set({
                      months: vals.length
                        ? vals.map(Number).sort((a, b) => a - b)
                        : undefined,
                    } as Partial<F>)
                  }
                  placeholder="Cả năm"
                  multiLabel={(n) => `${n} tháng`}
                />
              </div>
            </>
          )}
          {right}
          <div className="flex-1" />
          {hasExtra && (
            <button
              type="button"
              onClick={() => onChange(defaultFilters)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
              style={{ color: "var(--dt-text-secondary)" }}>
              <RotateCcw className="w-3.5 h-3.5" />
              Xoá lọc
            </button>
          )}
        </div>
      )}
      {slicers.length > 0 && (
        <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {slicers}
        </div>
      )}
      {note && (
        <div className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
          {note}
        </div>
      )}
    </div>
  );
}
