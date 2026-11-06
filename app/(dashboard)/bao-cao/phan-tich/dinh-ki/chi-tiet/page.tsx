"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { DetailTables } from "@/components/reports/analytics/dinh-ki/DetailTables";

// Phân tích › Định Kì › Chi Tiết (thay trang Power BI cùng tên — 4 bảng pivot).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <DetailTables />
    </AnalyticsReportShell>
  );
}
