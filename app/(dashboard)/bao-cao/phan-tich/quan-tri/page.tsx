"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { QtFilterBar } from "@/components/reports/analytics/quan-tri/QtFilterBar";
import {
  QtOverviewCards,
  QtOverviewCharts,
} from "@/components/reports/analytics/quan-tri/QtOverview";
import {
  QtBody,
  QtNote,
  QtPeriodInfo,
  QtUpdatedAt,
} from "@/components/reports/analytics/quan-tri/QtPageFrame";
import type { QtFilters } from "@/lib/api/analytics-quan-tri";
import {
  useQtFilterOptions,
  useQtOverview,
} from "@/lib/hooks/useAnalyticsQuanTri";

// Phân tích › Quản Trị › Tổng Quan (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<QtFilters>({
    year: new Date().getFullYear(),
    axis: "month",
    metric: "amount",
  });
  const { data: options } = useQtFilterOptions();
  const { data, isLoading, isFetching, error } = useQtOverview(filters);

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
        metrics={[
          "amount",
          "orders",
          "quantity",
          "customers",
          "profit",
          "margin",
        ]}
        slicers={["team", "vipWholesale", "productGroup"]}
      />
      <QtBody
        error={error}
        loading={isLoading || !data}
        emptyPeriod={!data?.period}
        year={filters.year}>
        {data?.cards && (
          <QtOverviewCards
            cards={data.cards}
            compareLabel={data.compareLabel}
          />
        )}
        {data && (
          <QtOverviewCharts
            data={data}
            metric={data.metric ?? filters.metric ?? "amount"}
            axis={filters.axis ?? "month"}
            onAxisChange={(axis) => setFilters((f) => ({ ...f, axis }))}
          />
        )}
        <QtNote>
          Báo cáo chỉ tính ngành hàng OEM / thương hiệu / thương mại và bỏ khách
          nội bộ (filter của Power BI), nên Doanh Số, Sản Lượng, Lợi Nhuận tính
          theo dòng hàng; AOV, ARPC tính trên toàn bộ hoá đơn. Giá vốn = giá vốn
          hiện tại của mã hàng (MAX giá vốn tồn kho các chi nhánh). % so kỳ
          trước của Biên Lợi Nhuận tính trên biên đã trừ hàng trả.
        </QtNote>
        <QtUpdatedAt at={data?.updatedAt} />
      </QtBody>
    </AnalyticsReportShell>
  );
}
