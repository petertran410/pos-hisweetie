"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { ChuyenKhoView } from "@/components/reports/analytics/mua-hang/ChuyenKhoViews";

// Phân tích › Chuyển Kho › Chuyển Kho (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="chuyen-kho">
      <ChuyenKhoView />
    </AnalyticsReportShell>
  );
}
