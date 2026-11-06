"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { HangTuanReport } from "@/components/reports/analytics/hang-tuan/HangTuanReport";

// Phân tích › Hằng Tuần › Kết Quả Hàng Tuần (thay report của dataset_sale - version 2).
export default function Page() {
  return (
    <AnalyticsReportShell report="hang-tuan">
      <HangTuanReport />
    </AnalyticsReportShell>
  );
}
