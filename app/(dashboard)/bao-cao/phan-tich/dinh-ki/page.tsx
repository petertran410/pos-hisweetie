"use client";

import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { AnalyticsFilterBar } from "@/components/reports/analytics/AnalyticsFilterBar";
import { BusinessOverviewCards } from "@/components/reports/analytics/BusinessOverviewCards";
import { BusinessOverviewCharts } from "@/components/reports/analytics/BusinessOverviewCharts";
import type {
  AnalyticsBusinessFilters,
  AnalyticsMetric,
} from "@/lib/api/analytics-reports";
import {
  useDinhKiFilterOptions,
  useDinhKiOverview,
} from "@/lib/hooks/useAnalyticsDinhKi";

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Phân tích › Định Kì › Tổng Quan — giống hệt Kinh Doanh › Tổng Quan của Power BI,
 * nhưng gọi endpoint riêng của Định Kì (quyền reports:analytics_periodic).
 */
export default function Page() {
  const [filters, setFilters] = useState<AnalyticsBusinessFilters>({
    year: new Date().getFullYear(),
    axis: "month",
  });
  const [metric, setMetric] = useState<AnalyticsMetric>("amount");
  const { data: options } = useDinhKiFilterOptions();
  const { data, isLoading, isFetching, error } = useDinhKiOverview(filters);

  return (
    <AnalyticsReportShell
      report="dinh-ki"
      right={
        <div
          className="text-[12px] flex items-center gap-2"
          style={{ color: "var(--dt-text-muted)" }}>
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {data?.period && (
            <span>
              Kỳ: {fmtDate(data.period.from)} – {fmtDate(data.period.to)}
              {data.compareRange && (
                <>
                  {" "}
                  · So với: {fmtDate(data.compareRange.from)} –{" "}
                  {fmtDate(data.compareRange.to)}
                </>
              )}
            </span>
          )}
        </div>
      }>
      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        metric={metric}
        onMetricChange={setMetric}
        options={options}
      />

      {data?.productFilter && (
        <div
          className="flex items-center gap-2 text-[12.5px] px-3 py-2 rounded-lg"
          style={{ background: "#FBF3DF", color: "#7A5F1E" }}>
          <Info className="w-4 h-4 shrink-0" />
          Đang lọc theo nhóm hàng: Doanh số, số hoá đơn và số khách tính theo
          các dòng hàng thuộc nhóm đó. AOV và ARPC vẫn tính trên toàn bộ hoá đơn
          (giống Power BI).
        </div>
      )}

      {error ? (
        <div className="dt-panel p-6 text-center text-[13px] text-red-600">
          Không tải được báo cáo: {(error as Error).message}
        </div>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="dt-sk h-[132px] rounded-xl" />
            ))}
          </div>
          <div className="dt-sk h-[340px] rounded-xl" />
          <div className="dt-sk h-[340px] rounded-xl" />
        </div>
      ) : !data.period ? (
        <div
          className="dt-panel p-8 text-center text-[13px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Kỳ đã chọn chưa có ngày nào (năm {filters.year} chưa bắt đầu).
        </div>
      ) : (
        <>
          <BusinessOverviewCards data={data} />
          <BusinessOverviewCharts
            data={data}
            metric={metric}
            axis={filters.axis ?? "month"}
            onAxisChange={(axis) => setFilters((f) => ({ ...f, axis }))}
          />
          <div
            className="text-[11.5px] text-right"
            style={{ color: "var(--dt-text-muted)" }}>
            Dữ liệu cập nhật vào lúc{" "}
            {new Date(data.updatedAt).toLocaleString("vi-VN")}
          </div>
        </>
      )}
    </AnalyticsReportShell>
  );
}
