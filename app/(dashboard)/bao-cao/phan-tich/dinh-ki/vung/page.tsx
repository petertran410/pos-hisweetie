"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { RegionDashboard } from "@/components/reports/analytics/dinh-ki/RegionDashboard";

// Phân tích › Định Kì › Vùng (thay trang Power BI cùng tên — html_region).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <RegionDashboard />
    </AnalyticsReportShell>
  );
}
