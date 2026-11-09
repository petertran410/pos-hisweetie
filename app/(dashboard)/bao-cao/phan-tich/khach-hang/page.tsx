"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhOverviewView } from "@/components/reports/analytics/khach-hang/KhOverviewView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type {
  AnalyticsAxis,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhFilterOptions,
  useKhOverview,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Phân tích › Khách Hàng › Tất Cả (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KhFilters>({
    year: new Date().getFullYear(),
  });
  const [axis, setAxis] = useState<AnalyticsAxis>("month");
  const [metric, setMetric] = useState<AnalyticsMetric>("amount");
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhOverview({
    ...filters,
    axis,
  });

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={
        <KhPeriodNote
          fetching={isFetching}
          period={data?.period}
          compare={data?.compareRange}
        />
      }>
      <KhFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        metric={metric}
        onMetricChange={setMetric}
      />
      {data?.productFilter && (
        <div
          className="flex items-center gap-2 text-[12.5px] px-3 py-2 rounded-lg"
          style={{ background: "#FBF3DF", color: "#7A5F1E" }}>
          <Info className="w-4 h-4 shrink-0" />
          Đang lọc theo hàng: biểu đồ tính theo các dòng hàng thuộc bộ lọc. Các
          thẻ Doanh Số, AOV, ARPC, Khách mới, Key PerSale, VIP vẫn tính trên
          toàn bộ hoá đơn (giống Power BI).
        </div>
      )}
      <KhStatus
        error={error}
        loading={isLoading || !data}
        noPeriod={!!data && !data.period}
        year={filters.year}>
        {data?.period && (
          <>
            <KhOverviewView
              data={data}
              metric={metric}
              axis={axis}
              onAxisChange={setAxis}
            />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
