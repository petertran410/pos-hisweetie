"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { MutLermaoPage } from "@/components/reports/analytics/khach-hang-dlcl/MutLermaoPage";

// Phân tích › Khách Hàng › ĐLCL Mứt Lermao (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <MutLermaoPage />
    </AnalyticsReportShell>
  );
}
