"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { BoduoPage } from "@/components/reports/analytics/khach-hang-dlcl/BoduoPage";

// Phân tích › Khách Hàng › ĐLCL Boduo (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <BoduoPage />
    </AnalyticsReportShell>
  );
}
