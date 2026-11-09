"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { HangLoaiBView } from "@/components/reports/analytics/mua-hang/ChuyenKhoViews";

// Phân tích › Chuyển Kho › Hàng Loại B (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="chuyen-kho">
      <HangLoaiBView />
    </AnalyticsReportShell>
  );
}
