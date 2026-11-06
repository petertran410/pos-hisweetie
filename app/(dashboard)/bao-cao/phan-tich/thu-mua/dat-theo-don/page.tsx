"use client";

import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { DatTheoDonView } from "@/components/reports/analytics/mua-hang/DatTheoDonView";

// Phân tích › Thu Mua › Đặt Theo Đơn (thay trang Power BI cùng tên).
export default function Page() {
  return (
    <AnalyticsReportShell report="thu-mua">
      <DatTheoDonView />
    </AnalyticsReportShell>
  );
}
