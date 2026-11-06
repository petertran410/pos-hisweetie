"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { LermaoPage } from "@/components/reports/analytics/khach-hang-dlcl/LermaoPage";

// Phân tích › Khách Hàng › ĐLCL Lermao (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <LermaoPage />
    </AnalyticsReportShell>
  );
}
