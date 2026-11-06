"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { ChurnSection } from "@/components/reports/analytics/kinh-doanh/ChurnSection";
import {
  AXIS_OPTIONS,
  BrandKeySection,
  DemandSection,
  DetailSection,
  LermaoSection,
  OverviewSection,
  RegionSection,
  RepeatSection,
} from "@/components/reports/analytics/kinh-doanh/CustomerSections";
import {
  KdFilterBar,
  type KdFilterKey,
} from "@/components/reports/analytics/kinh-doanh/KdFilterBar";
import {
  ErrorBox,
  Skeleton,
  UpdatedAt,
  ViewTabs,
} from "@/components/reports/analytics/kinh-doanh/KdUi";
import type { AnalyticsAxis } from "@/lib/api/analytics-reports";
import type {
  CustomerSection,
  KdFilters,
} from "@/lib/api/analytics-kinh-doanh";
import { useKdCustomer, useKdOptions } from "@/lib/hooks/useAnalyticsKinhDoanh";

// Nút "Navigator - Khách" của Power BI (bookmark) → các phần của trang.
const SECTIONS: { key: CustomerSection; label: string }[] = [
  { key: "overview", label: "Tất Cả" },
  { key: "region", label: "Vùng" },
  { key: "detail", label: "Chi Tiết" },
  { key: "repeat", label: "Repeat Customer" },
  { key: "churn", label: "Churn Customer" },
  { key: "demand", label: "Demand" },
  { key: "lermao", label: "ĐLCL Lermao" },
  { key: "mutLermao", label: "ĐLCL Mứt Lermao" },
  { key: "boduo", label: "ĐLCL Boduo" },
  { key: "phuongHoang", label: "ĐLCL Phượng Hoàng" },
];

const FILTERS: KdFilterKey[] = [
  "months",
  "metric",
  "customerType",
  "customerGroup",
  "parent",
  "region",
  "productGroup",
  "productType",
  "brand",
  "product",
];

// Phân tích › Kinh Doanh › Khách Hàng (thay trang Power BI cùng tên).
export default function Page() {
  const [section, setSection] = useState<CustomerSection>("overview");
  const [filters, setFilters] = useState<KdFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
    axis: "month",
  });
  const [unit, setUnit] = useState<"base" | "bulk">("bulk");
  const [demandCustomer, setDemandCustomer] = useState("");
  const { data: options } = useKdOptions();
  const isChurn = section === "churn";
  const q = useKdCustomer(
    filters,
    section,
    section === "demand"
      ? { unit, demandCustomer: demandCustomer || undefined }
      : undefined,
    !isChurn,
  );
  const data = q.data && q.data.section === section ? q.data : undefined;

  const axisSeg = (
    <div className="dt-seg dt-seg-sm">
      {AXIS_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          data-on={(filters.axis ?? "month") === o.key}
          onClick={() =>
            setFilters((f) => ({ ...f, axis: o.key as AnalyticsAxis }))
          }>
          {o.label}
        </button>
      ))}
    </div>
  );

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
      <ViewTabs value={section} onChange={setSection} options={SECTIONS} />
      <KdFilterBar filters={filters} onChange={setFilters} show={FILTERS} />
      {section === "demand" && (
        <div className="dt-panel p-3 flex flex-wrap items-center gap-3">
          <div className="dt-seg dt-seg-sm">
            {(["bulk", "base"] as const).map((u) => (
              <button
                key={u}
                type="button"
                data-on={unit === u}
                onClick={() => setUnit(u)}>
                {u === "bulk" ? "Thùng" : "Gói"}
              </button>
            ))}
          </div>
          <select
            className="text-[13px] border rounded-lg px-2.5 py-1.5"
            value={demandCustomer}
            onChange={(e) => setDemandCustomer(e.target.value)}>
            <option value="">Tên Chuỗi: Tất cả</option>
            {(options?.demandCustomers ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isChurn ? (
        <ChurnSection filters={filters} />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !data ? (
        <Skeleton />
      ) : !data.period ? (
        <div
          className="dt-panel p-8 text-center text-[13px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Kỳ đã chọn chưa có ngày nào.
        </div>
      ) : (
        <>
          {section === "overview" && (
            <OverviewSection data={data} axisSeg={axisSeg} />
          )}
          {section === "region" && (
            <RegionSection data={data} axisSeg={axisSeg} />
          )}
          {section === "detail" && (
            <DetailSection data={data} filters={filters} />
          )}
          {section === "repeat" && <RepeatSection data={data} />}
          {section === "demand" && <DemandSection data={data} />}
          {(section === "lermao" || section === "mutLermao") && (
            <LermaoSection data={data} filters={filters} />
          )}
          {(section === "boduo" || section === "phuongHoang") && (
            <BrandKeySection data={data} filters={filters} axisSeg={axisSeg} />
          )}
          <UpdatedAt at={data.updatedAt} />
        </>
      )}
    </AnalyticsReportShell>
  );
}
