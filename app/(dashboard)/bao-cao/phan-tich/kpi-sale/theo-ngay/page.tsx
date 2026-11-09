"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { FilterMultiSelect } from "@/components/ui/filters";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { DailyView } from "@/components/reports/analytics/kpi-sale/DailyView";
import {
  KpiSaleFilters,
  KpiState,
  UpdatedAt,
} from "@/components/reports/analytics/kpi-sale/KpiSaleFilters";
import type { KpiSaleDailyFilters } from "@/lib/api/analytics-kpi-sale";
import {
  useKpiSaleDaily,
  useKpiSaleOptions,
} from "@/lib/hooks/useAnalyticsKpiSale";

// Phân tích › KPI Sale › Theo Ngày (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KpiSaleDailyFilters>({
    year: new Date().getFullYear(),
    page: 1,
    pageSize: 100,
  });
  const [code, setCode] = useState("");
  const { data: options } = useKpiSaleOptions();
  const { data, isLoading, isFetching, error } = useKpiSaleDaily(filters);

  // Đổi bộ lọc → về trang 1 của bảng chi tiết.
  const change = (patch: Partial<KpiSaleDailyFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const y = filters.year;
  const hasExtra =
    !!filters.from ||
    !!filters.to ||
    !!filters.sellers?.length ||
    !!filters.groups?.length ||
    !!filters.invoiceCode;

  return (
    <AnalyticsReportShell
      report="kpi-sale"
      right={
        isFetching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        ) : null
      }>
      <KpiSaleFilters
        filters={filters}
        onChange={(f) =>
          change({
            ...f,
            // đổi năm thì bỏ khoảng ngày của năm cũ
            ...(f.year !== y ? { from: undefined, to: undefined } : {}),
          })
        }
        options={options}
        userLabel="Nhân Viên PIC"
        showMonths={false}
        hasExtra={hasExtra}
        onReset={() => {
          setCode("");
          setFilters({ year: y, page: 1, pageSize: filters.pageSize });
        }}
        extra={
          <>
            <div className="flex items-center gap-1.5">
              <DatePickerInput
                value={filters.from ?? ""}
                onChange={(v) => change({ from: v || undefined })}
                placeholder={`Ngày mua từ 01/01/${y}`}
                className="flex-1 min-w-0"
              />
              <span className="text-gray-400">–</span>
              <DatePickerInput
                value={filters.to ?? ""}
                onChange={(v) => change({ to: v || undefined })}
                placeholder={`đến 31/12/${y}`}
                className="flex-1 min-w-0"
              />
            </div>
            <FilterMultiSelect
              options={(data?.sellers ?? []).map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
              values={(filters.sellers ?? []).map(String)}
              onChange={(v) => change({ sellers: v.map(Number) })}
              placeholder="Người Bán: Tất cả"
              multiLabel={(n) => `Người Bán: ${n} người`}
            />
            <FilterMultiSelect
              options={(options?.productGroups ?? []).map((g) => ({
                value: g,
                label: g,
              }))}
              values={filters.groups ?? []}
              onChange={(v) => change({ groups: v })}
              placeholder="Nhóm Hàng: Tất cả"
              multiLabel={(n) => `Nhóm Hàng: ${n} nhóm`}
            />
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full border rounded-lg pl-8 pr-2.5 py-2 text-[13px] outline-none focus:border-[var(--dt-primary)]"
                placeholder="Mã Hóa Đơn (Enter để lọc)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={() =>
                  code.trim() !== (filters.invoiceCode ?? "") &&
                  change({ invoiceCode: code.trim() || undefined })
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  change({ invoiceCode: code.trim() || undefined })
                }
              />
            </div>
          </>
        }
      />
      <KpiState error={error} loading={isLoading || !data}>
        {data && (
          <DailyView
            data={data}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
        <UpdatedAt at={data?.updatedAt} />
      </KpiState>
    </AnalyticsReportShell>
  );
}
