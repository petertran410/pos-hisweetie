"use client";

import { ShieldOff } from "lucide-react";
import { AnalyticsTabs } from "@/components/reports/analytics/AnalyticsTabs";
import { AnalyticsConfigTables } from "@/components/reports/analytics/AnalyticsConfigTables";
import { useReportAccess } from "@/lib/permissions/reportPermissions";

/** Phân tích › Cấu hình: các quy tắc trước đây viết cứng trong Power BI. */
export default function AnalyticsConfigPage() {
  const { has } = useReportAccess();

  if (!has("reports:analytics_config")) {
    return (
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div>
          <ShieldOff className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-gray-600">
            Bạn chưa có quyền sửa cấu hình báo cáo Phân tích.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 space-y-3 max-w-[1500px]">
        <AnalyticsTabs />
        <AnalyticsConfigTables />
      </div>
    </div>
  );
}
