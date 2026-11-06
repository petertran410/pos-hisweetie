"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import {
  KpiSaleFilters,
  KpiState,
  UpdatedAt,
} from "@/components/reports/analytics/kpi-sale/KpiSaleFilters";
import { OrderOnBehalfView } from "@/components/reports/analytics/kpi-sale/OrderOnBehalfView";
import type { KpiSaleOrderFilters } from "@/lib/api/analytics-kpi-sale";
import {
  useKpiSaleOptions,
  useKpiSaleOrder,
} from "@/lib/hooks/useAnalyticsKpiSale";

const NO_SALE_PIC = "__none__";

// Phân tích › KPI Sale › Lên Đơn Hộ (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KpiSaleOrderFilters>({
    year: new Date().getFullYear(),
    page: 1,
    pageSize: 100,
  });
  const { data: options } = useKpiSaleOptions();
  const { data, isLoading, isFetching, error } = useKpiSaleOrder(filters);
  const change = (patch: Partial<KpiSaleOrderFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

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
        onChange={(f) => change(f)}
        options={options}
        hasExtra={!!filters.salePics?.length || !!filters.search}
        onReset={() =>
          setFilters({ year: filters.year, page: 1, pageSize: 100 })
        }
        extra={
          <FilterMultiSelect
            options={[
              ...(options?.salePics ?? []).map((s) => ({ value: s, label: s })),
              { value: NO_SALE_PIC, label: "(Trống)" },
            ]}
            values={filters.salePics ?? []}
            onChange={(v) => change({ salePics: v })}
            placeholder="Sale PIC: Tất cả"
            searchable={false}
            multiLabel={(n) => `Sale PIC: ${n}`}
          />
        }
      />
      <KpiState error={error} loading={isLoading || !data}>
        {data && (
          <OrderOnBehalfView
            data={data}
            search={filters.search ?? ""}
            onSearch={(search) => change({ search: search || undefined })}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
        <UpdatedAt at={data?.updatedAt} />
      </KpiState>
    </AnalyticsReportShell>
  );
}
