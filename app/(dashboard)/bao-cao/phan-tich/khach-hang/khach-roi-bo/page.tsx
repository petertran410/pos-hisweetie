"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhChurnView } from "@/components/reports/analytics/khach-hang/KhChurnView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhChurn,
  useKhFilterOptions,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Phân tích › Khách Hàng › Churn Customer (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KhFilters>({
    year: new Date().getFullYear(),
  });
  const [metric, setMetric] = useState<AnalyticsMetric>("amount");
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhChurn(filters);

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={<KhPeriodNote fetching={isFetching} period={data?.period} />}>
      <KhFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        metric={metric}
        onMetricChange={setMetric}
      />
      <KhStatus error={error} loading={isLoading || !data}>
        {data && (
          <>
            <KhChurnView data={data} metric={metric} />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
