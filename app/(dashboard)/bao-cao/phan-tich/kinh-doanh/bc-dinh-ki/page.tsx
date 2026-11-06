"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KdFilterBar } from "@/components/reports/analytics/kinh-doanh/KdFilterBar";
import {
  ErrorBox,
  Skeleton,
  UpdatedAt,
  ViewTabs,
} from "@/components/reports/analytics/kinh-doanh/KdUi";
import { PeriodicDashboardView } from "@/components/reports/analytics/kinh-doanh/PeriodicDashboardView";
import { PeriodicDetailView } from "@/components/reports/analytics/kinh-doanh/PeriodicDetailView";
import { PeriodicRegionView } from "@/components/reports/analytics/kinh-doanh/PeriodicRegionView";
import type { KdFilters } from "@/lib/api/analytics-kinh-doanh";
import {
  usePeriodicDashboard,
  usePeriodicDetail,
  usePeriodicRegion,
} from "@/lib/hooks/useAnalyticsKinhDoanh";

type View = "week" | "lastWeek" | "month" | "region" | "detail";

const VIEWS: { key: View; label: string }[] = [
  { key: "week", label: "Tuần Này" },
  { key: "lastWeek", label: "Tuần Trước" },
  { key: "month", label: "Tháng" },
  { key: "region", label: "Vùng" },
  { key: "detail", label: "Chi Tiết" },
];

// Phân tích › Kinh Doanh › BC Định Kì (thay trang Power BI cùng tên; các nút
// Tuần Này / Tuần Trước / Tháng / Vùng / Chi Tiết thay bookmark).
export default function Page() {
  const [view, setView] = useState<View>("week");
  const [filters, setFilters] = useState<KdFilters>({
    year: new Date().getFullYear(),
  });
  const isDash = view === "week" || view === "lastWeek" || view === "month";

  const dash = usePeriodicDashboard(filters, isDash ? view : "week", isDash);
  const region = usePeriodicRegion(filters, view === "region");
  const detail = usePeriodicDetail(filters, view === "detail");
  const q = isDash ? dash : view === "region" ? region : detail;

  return (
    <AnalyticsReportShell
      report="kinh-doanh"
      right={
        q.isFetching ? (
          <Loader2
            className="w-3.5 h-3.5 animate-spin"
            style={{ color: "var(--dt-text-muted)" }}
          />
        ) : null
      }>
      <div className="flex flex-wrap items-center gap-3">
        <ViewTabs value={view} onChange={setView} options={VIEWS} />
      </div>
      <KdFilterBar
        filters={filters}
        onChange={setFilters}
        show={
          view === "detail"
            ? ["months", "saleTeam", "productGroup", "specialGroup", "parent"]
            : ["saleTeam", "productGroup", "specialGroup", "parent"]
        }
        note={
          view === "detail"
            ? "Năm / Tháng áp dụng cho bảng theo tuần và % mục tiêu năm"
            : "Tuần / tháng tính theo ngày hôm nay"
        }
      />

      {q.error ? (
        <ErrorBox error={q.error} />
      ) : q.isLoading || !q.data ? (
        <Skeleton />
      ) : isDash && dash.data ? (
        <PeriodicDashboardView data={dash.data} />
      ) : view === "region" && region.data ? (
        <PeriodicRegionView data={region.data} />
      ) : view === "detail" && detail.data ? (
        <>
          <PeriodicDetailView data={detail.data} />
          <UpdatedAt at={detail.data.updatedAt} />
        </>
      ) : (
        <Skeleton />
      )}
    </AnalyticsReportShell>
  );
}
