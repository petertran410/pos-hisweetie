"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KdFilterBar } from "@/components/reports/analytics/kinh-doanh/KdFilterBar";
import {
  ErrorBox,
  Skeleton,
  UpdatedAt,
} from "@/components/reports/analytics/kinh-doanh/KdUi";
import { ProductPageView } from "@/components/reports/analytics/kinh-doanh/ProductPageView";
import type { KdFilters } from "@/lib/api/analytics-kinh-doanh";
import { useKdProduct } from "@/lib/hooks/useAnalyticsKinhDoanh";

// Phân tích › Kinh Doanh › Sản Phẩm (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KdFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
  });
  const { data, isLoading, isFetching, error } = useKdProduct(filters);

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
      <KdFilterBar
        filters={filters}
        onChange={setFilters}
        show={[
          "months",
          "metric",
          "saleTeam",
          "customerType",
          "customerGroup",
          "parent",
          "region",
          "productGroup",
          "productType",
          "brand",
          "category",
          "product",
        ]}
      />
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
          <ProductPageView data={data} filters={filters} />
          <UpdatedAt at={data.updatedAt} />
        </>
      )}
    </AnalyticsReportShell>
  );
}
