"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KpiSaleNotice } from "@/components/reports/analytics/dinh-ki/KpiSaleNotice";

// Phân tích › Định Kì › KPI Sale (thay trang Power BI cùng tên — trang trống).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <KpiSaleNotice />
    </AnalyticsReportShell>
  );
}
