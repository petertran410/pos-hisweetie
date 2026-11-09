"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhWeeklyView } from "@/components/reports/analytics/khach-hang/KhWeeklyView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhFilterOptions,
  useKhWeekly,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Phân tích › Khách Hàng › VIP (thay trang Power BI cùng tên).
// Mặc định xem tháng hiện tại (bảng theo tuần của cả năm rất rộng).
export default function Page() {
  const now = new Date();
  const [filters, setFilters] = useState<KhFilters>({
    year: now.getFullYear(),
    months: [now.getMonth() + 1],
  });
  const [week, setWeek] = useState<number | undefined>();
  const [metric, setMetric] = useState<AnalyticsMetric>("amount");
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhWeekly("vip", {
    ...filters,
    week,
    metric,
  });
  const changeFilters = (f: KhFilters) => {
    setFilters(f);
    setWeek(undefined);
  };

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={<KhPeriodNote fetching={isFetching} period={data?.period} />}>
      <KhFilterBar
        filters={filters}
        onChange={changeFilters}
        options={options}
        metric={metric}
        onMetricChange={setMetric}
        extra={
          <div className="w-56">
            <FilterSearchableSelect
              options={(data?.weekOptions ?? []).map((w) => ({
                value: String(w.wk),
                label: w.label,
              }))}
              value={week ? String(week) : ""}
              onChange={(v) => setWeek(v ? Number(v) : undefined)}
              placeholder="Chọn tuần: Tất cả"
            />
          </div>
        }
      />
      <KhStatus
        error={error}
        loading={isLoading || !data}
        noPeriod={!!data && !data.period}
        year={filters.year}>
        {data?.period && (
          <>
            <KhWeeklyView data={data} kind="vip" metric={metric} />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
