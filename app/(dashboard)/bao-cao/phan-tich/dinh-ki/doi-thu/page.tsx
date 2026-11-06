"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { BrandCompare } from "@/components/reports/analytics/dinh-ki/BrandCompare";

// Phân tích › Định Kì › Đối Thủ (thay trang Power BI cùng tên — html_brand_compare).
export default function Page() {
  return (
    <AnalyticsReportShell report="dinh-ki">
      <BrandCompare />
    </AnalyticsReportShell>
  );
}
