"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { QtFilterBar } from "@/components/reports/analytics/quan-tri/QtFilterBar";
import {
  QtBody,
  QtNote,
  QtPeriodInfo,
  QtUpdatedAt,
} from "@/components/reports/analytics/quan-tri/QtPageFrame";
import { QtProductsView } from "@/components/reports/analytics/quan-tri/QtProductsView";
import type { QtFilters } from "@/lib/api/analytics-quan-tri";
import {
  useQtFilterOptions,
  useQtProducts,
} from "@/lib/hooks/useAnalyticsQuanTri";

// Phân tích › Quản Trị › Sản Phẩm (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<QtFilters>({
    year: new Date().getFullYear(),
    axis: "day",
    metric: "amount",
  });
  const { data: options } = useQtFilterOptions();
  const { data, isLoading, isFetching, error } = useQtProducts(filters);

  return (
    <AnalyticsReportShell
      report="quan-tri"
      right={
        <QtPeriodInfo
          period={data?.period}
          compareRange={data?.compareRange}
          fetching={isFetching}
        />
      }>
      <QtFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        metrics={["amount", "orders", "quantity", "customers", "profit"]}
        slicers={["category", "brand", "product"]}
      />
      <QtBody
        error={error}
        loading={isLoading || !data}
        emptyPeriod={!data?.period}
        year={filters.year}>
        {data?.period && (
          <QtProductsView
            data={data}
            metric={data.metric ?? "amount"}
            axis={filters.axis ?? "day"}
            onAxisChange={(axis) => setFilters((f) => ({ ...f, axis }))}
          />
        )}
        <QtNote>
          Chỉ tính hàng OEM / thương hiệu / thương mại. Mục tiêu năm = tổng chỉ
          tiêu KPI Sale các tháng tới tháng cuối kỳ; thực đạt = doanh số toàn bộ
          hoá đơn trong kỳ (như Power BI). Biên Lợi Nhuận trang này đã trừ hàng
          trả.
        </QtNote>
        <QtUpdatedAt at={data?.updatedAt} />
      </QtBody>
    </AnalyticsReportShell>
  );
}
