"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { TienMatKhoView } from "@/components/reports/analytics/ke-toan/TienMatKhoView";

// Phân tích › Kế Toán › Tiền Mặt - Kho (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="ke-toan">
      <TienMatKhoView />
    </AnalyticsReportShell>
  );
}
