"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { XuatDataPage } from "@/components/reports/analytics/khach-hang-dlcl/XuatDataPage";

// Phân tích › Khách Hàng › Xuất Data (> 12 tháng) (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <XuatDataPage />
    </AnalyticsReportShell>
  );
}
