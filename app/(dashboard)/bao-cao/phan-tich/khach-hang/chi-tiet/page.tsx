"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { ChiTietPage } from "@/components/reports/analytics/khach-hang-dlcl/ChiTietPage";

// Phân tích › Khách Hàng › Chi Tiết (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <ChiTietPage />
    </AnalyticsReportShell>
  );
}
