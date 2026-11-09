"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { BienThuongMaiPage } from "@/components/reports/analytics/khach-hang-dlcl/BienThuongMaiPage";

// Phân tích › Khách Hàng › Biên Thương Mại (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="khach-hang">
      <BienThuongMaiPage />
    </AnalyticsReportShell>
  );
}
