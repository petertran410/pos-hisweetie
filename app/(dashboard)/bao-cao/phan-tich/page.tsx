"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  ANALYTICS_CONFIG_PERM,
  ANALYTICS_REPORTS,
  reportHref,
} from "@/components/reports/analytics/reportRegistry";

// Vào nhóm Phân tích → mở báo cáo đầu tiên user có quyền.
export default function AnalyticsIndexPage() {
  const router = useRouter();
  const { has } = useReportAccess();
  const first = ANALYTICS_REPORTS.find((r) => has(r.perm));
  const target = first
    ? reportHref(first.slug)
    : has(ANALYTICS_CONFIG_PERM)
      ? "/bao-cao/phan-tich/cau-hinh"
      : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return (
    <div className="flex-1 grid place-items-center text-sm text-gray-500">
      {target ? (
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      ) : (
        "Bạn chưa có quyền xem báo cáo Phân tích."
      )}
    </div>
  );
}
