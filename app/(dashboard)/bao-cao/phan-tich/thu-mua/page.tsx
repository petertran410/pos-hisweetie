"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { TonKhoView } from "@/components/reports/analytics/mua-hang/TonKhoView";

// Phân tích › Thu Mua › Tồn Kho (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="thu-mua">
      <TonKhoView />
    </AnalyticsReportShell>
  );
}
