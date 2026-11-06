"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { QtCustomersView } from "@/components/reports/analytics/quan-tri/QtCustomersView";
import { QtFilterBar } from "@/components/reports/analytics/quan-tri/QtFilterBar";
import {
  QtBody,
  QtNote,
  QtPeriodInfo,
  QtUpdatedAt,
} from "@/components/reports/analytics/quan-tri/QtPageFrame";
import type { QtFilters } from "@/lib/api/analytics-quan-tri";
import {
  useQtCustomers,
  useQtFilterOptions,
} from "@/lib/hooks/useAnalyticsQuanTri";

// Phân tích › Quản Trị › Khách Hàng (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<QtFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
  });
  const { data: options } = useQtFilterOptions();
  const { data, isLoading, isFetching, error } = useQtCustomers(filters);

  return (
    <AnalyticsReportShell
      report="quan-tri"
      right={<QtPeriodInfo period={data?.period} fetching={isFetching} />}>
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
        slicers={["customerType", "vipParent", "team", "groupSource"]}
      />
      <QtBody
        error={error}
        loading={isLoading || !data}
        emptyPeriod={!data?.period}
        year={filters.year}>
        {data?.period && (
          <QtCustomersView data={data} metric={data.metric ?? "amount"} />
        )}
        <QtNote>
          Khách mới / quay lại / mua lại xét trên toàn bộ lịch sử mua của khách
          cha (kể cả hệ thống cũ). Bảng và biểu đồ theo nhóm khách bỏ khách chưa
          gắn nhóm (Khách buôn / chuỗi / lẻ), như Power BI.
        </QtNote>
        <QtUpdatedAt at={data?.updatedAt} />
      </QtBody>
    </AnalyticsReportShell>
  );
}
