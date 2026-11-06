"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import {
  KpiSaleFilters,
  KpiState,
  UpdatedAt,
} from "@/components/reports/analytics/kpi-sale/KpiSaleFilters";
import { LogicView } from "@/components/reports/analytics/kpi-sale/LogicView";
import type { KpiSaleFilters as Filters } from "@/lib/api/analytics-kpi-sale";
import {
  useKpiSaleLogic,
  useKpiSaleOptions,
} from "@/lib/hooks/useAnalyticsKpiSale";

// Phân tích › KPI Sale › Logic (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<Filters>({
    year: new Date().getFullYear(),
  });
  const { data: options } = useKpiSaleOptions();
  const { data, isLoading, isFetching, error } = useKpiSaleLogic(filters);

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
        onChange={setFilters}
        options={options}
      />
      <KpiState error={error} loading={isLoading || !data}>
        {data && <LogicView data={data} />}
        <UpdatedAt at={data?.updatedAt} />
      </KpiState>
    </AnalyticsReportShell>
  );
}
