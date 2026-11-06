"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { ChuyenHangView } from "@/components/reports/analytics/ke-toan/ChuyenHangView";

// Phân tích › Kế Toán › Chuyển Hàng (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="ke-toan">
      <ChuyenHangView />
    </AnalyticsReportShell>
  );
}
