"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import {
  COMPETITOR_PIVOT_ROWS,
  CompetitorView,
} from "@/components/reports/analytics/kinh-doanh/CompetitorView";
import { usePrefetchKdPivot } from "@/components/reports/analytics/kinh-doanh/KdPivot";
import { KdFilterBar } from "@/components/reports/analytics/kinh-doanh/KdFilterBar";
import {
  ErrorBox,
  Skeleton,
  UpdatedAt,
} from "@/components/reports/analytics/kinh-doanh/KdUi";
import type { KdFilters } from "@/lib/api/analytics-kinh-doanh";
import { useKdCompetitor } from "@/lib/hooks/useAnalyticsKinhDoanh";

// Phân tích › Kinh Doanh › Đối Thủ (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KdFilters>({
    year: new Date().getFullYear(),
  });
  const { data, isLoading, isFetching, error } = useKdCompetitor(filters);
  // Bảng tổng hợp tải song song với số liệu chính (trước đây đợi số liệu chính về).
  usePrefetchKdPivot(filters, { rows: COMPETITOR_PIVOT_ROWS });

  return (
    <AnalyticsReportShell
      report="kinh-doanh"
      right={
        isFetching ? (
          <Loader2
            className="w-3.5 h-3.5 animate-spin"
            style={{ color: "var(--dt-text-muted)" }}
          />
        ) : null
      }>
      <KdFilterBar filters={filters} onChange={setFilters} show={["months"]} />
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <Skeleton />
      ) : !data.period ? (
        <div
          className="dt-panel p-8 text-center text-[13px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Kỳ đã chọn chưa có ngày nào.
        </div>
      ) : (
        <>
          <CompetitorView data={data} filters={filters} />
          <UpdatedAt at={data.updatedAt} />
        </>
      )}
    </AnalyticsReportShell>
  );
}
