"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { PhuongHoangPage } from "@/components/reports/analytics/khach-hang-dlcl/PhuongHoangPage";

// Phân tích › Khách Hàng › ĐLCL Phượng Hoàng (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <PhuongHoangPage />
    </AnalyticsReportShell>
  );
}
