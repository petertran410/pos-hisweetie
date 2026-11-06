"use client";

import type { ReactNode } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { DashSelect } from "@/components/dashboard/DashSelect";
import { FilterMultiSelect } from "@/components/ui/filters";
import type {
  KpiSaleFilters,
  KpiSaleOptions,
} from "@/lib/api/analytics-kpi-sale";
import { MONTH_OPTIONS } from "./kpiFormat";

/**
 * Bộ lọc chung của KPI Sale (slicer Power BI): Năm, Tháng, Nhân viên
 * (dim_user[given_name]). `extra` = các slicer riêng của từng trang.
 */
export function KpiSaleFilters<F extends KpiSaleFilters>({
  filters,
  onChange,
  options,
  userLabel = "Người Bán",
  showMonths = true,
  extra,
  hasExtra = false,
  onReset,
}: {
  filters: F;
  onChange: (f: F) => void;
  options?: KpiSaleOptions;
  userLabel?: string;
  showMonths?: boolean;
  extra?: ReactNode;
  hasExtra?: boolean;
  onReset?: () => void;
}) {
  const set = (patch: Partial<F>) => onChange({ ...filters, ...patch });
  const yearOptions = (options?.years ?? [filters.year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));
  const dirty = hasExtra || !!filters.months?.length || !!filters.users?.length;

  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <DashSelect
          ariaLabel="Năm"
          options={yearOptions}
          value={String(filters.year)}
          onChange={(k) => set({ year: Number(k) } as Partial<F>)}
          size="md"
        />
        {showMonths && (
          <div className="w-44">
            <FilterMultiSelect
              options={MONTH_OPTIONS}
              values={(filters.months ?? []).map(String)}
              onChange={(vals) =>
                set({
                  months: vals.map(Number).sort((a, b) => a - b),
                } as Partial<F>)
              }
              placeholder="Tháng: Tất cả"
              searchable={false}
              multiLabel={(n) => `${n} tháng`}
            />
          </div>
        )}
        <div className="w-60">
          <FilterMultiSelect
            options={(options?.users ?? []).map((u) => ({
              value: u.code,
              label: u.name,
            }))}
            values={filters.users ?? []}
            onChange={(vals) => set({ users: vals } as Partial<F>)}
            placeholder={`${userLabel}: Tất cả`}
            multiLabel={(n) => `${userLabel}: ${n} người`}
          />
        </div>
        {options?.restricted && (
          <span
            className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full"
            style={{ background: "#FBF3DF", color: "#7A5F1E" }}
            title="Bạn chỉ xem được khách và chỉ tiêu của mình (và khách chưa có người phụ trách)">
            <Lock className="w-3.5 h-3.5" />
            Chỉ số liệu của bạn
          </span>
        )}
        <div className="flex-1" />
        {dirty && (
          <button
            type="button"
            onClick={() =>
              onReset
                ? onReset()
                : onChange({
                    ...filters,
                    months: undefined,
                    users: undefined,
                  })
            }
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
      </div>
      {extra && (
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {extra}
        </div>
      )}
    </div>
  );
}

/** Khung tải / lỗi dùng chung cho các trang KPI Sale. */
export function KpiState({
  error,
  loading,
  children,
}: {
  error: unknown;
  loading: boolean;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  if (loading)
    return (
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dt-sk h-[110px] rounded-xl" />
          ))}
        </div>
        <div className="dt-sk h-[320px] rounded-xl" />
      </div>
    );
  return <>{children}</>;
}

export function UpdatedAt({ at }: { at?: string }) {
  if (!at) return null;
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}
