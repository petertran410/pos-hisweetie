"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { MonthlyDashboard } from "@/components/reports/analytics/dinh-ki/MonthlyDashboard";

// Phân tích › Định Kì › Tháng (thay trang Power BI cùng tên — html_monthly).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <MonthlyDashboard />
    </AnalyticsReportShell>
  );
}
