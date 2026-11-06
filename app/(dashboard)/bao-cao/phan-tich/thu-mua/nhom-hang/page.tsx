"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { NhomHangView } from "@/components/reports/analytics/mua-hang/SalesView";

// Phân tích › Thu Mua › Nhóm Hàng (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="thu-mua">
      <NhomHangView />
    </AnalyticsReportShell>
  );
}
