"use client";

import { useState } from "react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { QtFilterBar } from "@/components/reports/analytics/quan-tri/QtFilterBar";
import {
  QtBody,
  QtNote,
  QtPeriodInfo,
  QtUpdatedAt,
} from "@/components/reports/analytics/quan-tri/QtPageFrame";
import {
  CustomerDetailTable,
  ProductDetailTable,
  ProfitCustomerView,
  ProfitProductView,
  ProfitTeamView,
  ProfitTreeView,
} from "@/components/reports/analytics/quan-tri/QtProfitViews";
import type { QtFilters, QtProfitView } from "@/lib/api/analytics-quan-tri";
import {
  useQtFilterOptions,
  useQtProfit,
} from "@/lib/hooks/useAnalyticsQuanTri";

/** Bookmark của trang Power BI → API view. */
const BOOKMARKS: { key: string; label: string; view: QtProfitView }[] = [
  { key: "team", label: "Nhóm Bán", view: "team" },
  { key: "customer", label: "Khách Hàng Key", view: "customer" },
  { key: "product", label: "Hàng Hóa", view: "product" },
  { key: "tree", label: "Cây Lợi Nhuận", view: "product" },
  { key: "productDetail", label: "BC Chi Tiết Hàng Hóa", view: "product" },
  {
    key: "customerDetail",
    label: "BC Chi Tiết Khách Hàng",
    view: "customerDetail",
  },
];

// Phân tích › Quản Trị › Lợi Nhuận (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<QtFilters>({
    year: new Date().getFullYear(),
  });
  const [bookmark, setBookmark] = useState("team");
  const bm = BOOKMARKS.find((b) => b.key === bookmark) ?? BOOKMARKS[0];
  const { data: options } = useQtFilterOptions();
  const { data, isLoading, isFetching, error } = useQtProfit(filters, bm.view);
  const ready = data && data.view === bm.view;

  return (
    <AnalyticsReportShell
      report="quan-tri"
      right={<QtPeriodInfo period={data?.period} fetching={isFetching} />}>
      <QtFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        slicers={[
          "team",
          "customerType",
          "parent",
          "groupSource",
          "productType",
          "category",
          "origin",
          "brand",
          "product",
        ]}
      />
      <div className="dt-seg flex-wrap self-start">
        {BOOKMARKS.map((b) => (
          <button
            key={b.key}
            type="button"
            data-on={bookmark === b.key}
            onClick={() => setBookmark(b.key)}>
            {b.label}
          </button>
        ))}
      </div>
      <QtBody
        error={error}
        loading={isLoading || !ready}
        emptyPeriod={!data?.period}
        year={filters.year}>
        {ready && data.view === "team" && <ProfitTeamView data={data} />}
        {ready && data.view === "customer" && (
          <ProfitCustomerView data={data} />
        )}
        {ready && data.view === "product" && bookmark === "product" && (
          <ProfitProductView data={data} />
        )}
        {ready && data.view === "product" && bookmark === "tree" && (
          <ProfitTreeView data={data} />
        )}
        {ready && data.view === "product" && bookmark === "productDetail" && (
          <ProductDetailTable data={data} />
        )}
        {ready && data.view === "customerDetail" && (
          <CustomerDetailTable data={data} />
        )}
        <QtNote>
          Lợi nhuận gộp = Doanh số − giá vốn (giá vốn hiện tại của mã hàng).
          Biểu đồ theo nhóm bán / khách trừ thêm hàng trả trong kỳ (phiếu trả
          gắn nhân viên, khách của hoá đơn gốc). Power BI chưa có cấp “nhóm phụ
          / hương vị” cho mặt hàng nên các bảng dùng tên mặt hàng.
        </QtNote>
        <QtUpdatedAt at={data?.updatedAt} />
      </QtBody>
    </AnalyticsReportShell>
  );
}
