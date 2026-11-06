"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhRepeatView } from "@/components/reports/analytics/khach-hang/KhRepeatView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhFilterOptions,
  useKhRepeat,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Phân tích › Khách Hàng › Repeat Customer (thay trang Power BI cùng tên).
// Các chỉ số RC … của Power BI cần chọn đúng 1 tháng → mặc định tháng hiện tại.
export default function Page() {
  const now = new Date();
  const [filters, setFilters] = useState<KhFilters>({
    year: now.getFullYear(),
    months: [now.getMonth() + 1],
  });
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhRepeat(filters);

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={
        <KhPeriodNote
          fetching={isFetching}
          period={data?.month}
          compare={
            data?.month
              ? { from: data.month.prevFrom, to: data.month.prevTo }
              : null
          }
        />
      }>
      <KhFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        singleMonth
      />
      <KhStatus
        error={error}
        loading={isLoading || !data}
        noPeriod={!!data && !data.month}
        year={filters.year}>
        {data?.month && (
          <>
            <KhRepeatView data={data} />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
