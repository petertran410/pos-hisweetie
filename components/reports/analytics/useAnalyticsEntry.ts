"use client";

import { useCallback } from "react";
import { usePrefetchBusinessOverview } from "@/lib/hooks/useAnalyticsReports";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  ANALYTICS_CONFIG_PERM,
  ANALYTICS_REPORTS,
  reportHref,
} from "./reportRegistry";

/**
 * Tải trước số liệu trang đầu của một báo cáo Phân tích ngay lúc người dùng bấm vào
 * (request chạy song song với lúc tải + dựng trang). Hiện có: Kinh Doanh › Tổng Quan.
 * Báo cáo khác: gọi không làm gì.
 */
export function usePrefetchAnalyticsReport() {
  const prefetchOverview = usePrefetchBusinessOverview();
  return useCallback(
    (reportSlug: string) => {
      if (reportSlug === "kinh-doanh") prefetchOverview();
    },
    [prefetchOverview],
  );
}

/**
 * Đích khi vào nhóm Phân tích: báo cáo đầu tiên user có quyền (không có thì trang
 * Cấu hình; null = không có quyền nào) + hàm tải trước số liệu của báo cáo đó.
 */
export function useAnalyticsEntry() {
  const { has } = useReportAccess();
  const prefetchReport = usePrefetchAnalyticsReport();
  const first = ANALYTICS_REPORTS.find((r) => has(r.perm));
  const firstSlug = first?.slug;
  const target = first
    ? reportHref(first.slug)
    : has(ANALYTICS_CONFIG_PERM)
      ? "/bao-cao/phan-tich/cau-hinh"
      : null;
  const prefetch = useCallback(() => {
    if (firstSlug) prefetchReport(firstSlug);
  }, [firstSlug, prefetchReport]);
  return { target, prefetch };
}
