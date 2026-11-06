"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { MappingMisaView } from "@/components/reports/analytics/ke-toan/MappingMisaView";

// Phân tích › Kế Toán › Mapping Misa (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="ke-toan">
      <MappingMisaView />
    </AnalyticsReportShell>
  );
}
