"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { WeeklyDashboard } from "@/components/reports/analytics/dinh-ki/WeeklyDashboard";

// Phân tích › Định Kì › Tuần Này (thay trang Power BI cùng tên — measure html_weekly).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <WeeklyDashboard mode="this" />
    </AnalyticsReportShell>
  );
}
