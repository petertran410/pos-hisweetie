"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { DoiSoatView } from "@/components/reports/analytics/ke-toan/DoiSoatView";

// Phân tích › Kế Toán › Đối Soát (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="ke-toan">
      <DoiSoatView />
    </AnalyticsReportShell>
  );
}
