"use client";

import { useState } from "react";
import { FilterMultiSelect } from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import type { QuoteFilters, QuoteStatus, QuoteTemplate } from "@/lib/types/quote";
import { QUOTE_STATUS_LABEL, QUOTE_TEMPLATE_LABEL } from "@/lib/types/quote";

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

const ALL_TIME: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "all_time",
  fromDate: "",
  toDate: "",
};

type Props = {
  filters: QuoteFilters;
  /** Sale có trong dữ liệu — giai đoạn 2 lấy từ danh sách người dùng. */
  sales: { id: number; name: string }[];
  onChange: (patch: Partial<QuoteFilters>) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

export function QuotesSidebar({ filters, sales, onChange }: Props) {
  const [range, setRange] = useState<TimeRangeState>(ALL_TIME);

  const active =
    (filters.status?.length ?? 0) +
    (filters.template?.length ?? 0) +
    (filters.createdById?.length ?? 0) +
    (filters.fromDate ? 1 : 0);

  const clearAll = () => {
    setRange(ALL_TIME);
    onChange({
      status: undefined,
      template: undefined,
      createdById: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
  };

  return (
    <aside className="hidden md:flex w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {active > 0 && (
          <button onClick={clearAll} className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <TimeRangeFilter
          label="Ngày tạo"
          value={range}
          onChange={(next) => {
            setRange(next);
            const iso = rangeToIso(next);
            onChange({ fromDate: iso?.from, toDate: iso?.to });
          }}
        />
        <div className="border-t border-gray-100" />
        <Field label="Trạng thái">
          <FilterMultiSelect
            options={options(QUOTE_STATUS_LABEL)}
            values={filters.status ?? []}
            onChange={(v) => onChange({ status: v.length ? (v as QuoteStatus[]) : undefined })}
            placeholder="Tất cả trạng thái"
            searchable={false}
          />
        </Field>
        <div className="border-t border-gray-100" />
        <Field label="Mẫu báo giá">
          <FilterMultiSelect
            options={options(QUOTE_TEMPLATE_LABEL)}
            values={filters.template ?? []}
            onChange={(v) => onChange({ template: v.length ? (v as QuoteTemplate[]) : undefined })}
            placeholder="Tất cả mẫu"
            searchable={false}
          />
        </Field>
        <div className="border-t border-gray-100" />
        <Field label="Sale">
          <FilterMultiSelect
            options={sales.map((s) => ({ value: String(s.id), label: s.name }))}
            values={(filters.createdById ?? []).map(String)}
            onChange={(v) => onChange({ createdById: v.length ? v.map(Number) : undefined })}
            placeholder="Tất cả Sale"
            searchPlaceholder="Tìm Sale..."
          />
        </Field>
      </div>
    </aside>
  );
}
