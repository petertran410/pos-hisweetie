"use client";

import { useState } from "react";
import { Panel } from "../shared/AnalyticsCharts";
import { AnalyticsTable, type AnalyticsColumn } from "../shared/AnalyticsTable";
import { BLANK_LABEL, metricTitle } from "../analyticsFormat";
import type {
  ChiTietReport,
  CustomerTypeRow,
  DlclFilters,
} from "@/lib/api/analytics-khach-hang-dlcl";
import {
  useDlclExpand,
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { TrendLineChart } from "./DlclCharts";
import { numText } from "./dlclFormat";
import {
  AXIS_OPTIONS,
  AxisSeg,
  DlclBody,
  DlclNote,
  DlclPeriodBadge,
} from "./DlclPageFrame";

const COLUMN_OPTIONS = [
  { key: "month" as const, label: "Theo tháng" },
  { key: "week" as const, label: "Theo tuần" },
];

const num = (v: unknown) => numText(v as number | null);
const TYPE_COLUMNS: AnalyticsColumn<CustomerTypeRow>[] = [
  {
    key: "customerType",
    label: "Nhóm khách",
    format: (v) => (v as string | null) ?? BLANK_LABEL,
  },
  { key: "quantity", label: "Sản Lượng", align: "right", format: num },
  { key: "orders", label: "Hóa Đơn", align: "right", format: num },
  { key: "amount", label: "Doanh Số", align: "right", format: num },
  { key: "aov", label: "AOV", align: "right", format: num },
  {
    key: "aoc",
    label: "AOC",
    align: "right",
    format: (v) =>
      v === null || v === undefined
        ? ""
        : Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
  },
  { key: "arpc", label: "ARPC", align: "right", format: num },
  {
    key: "newCustomers",
    label: "Số Lượng Khách Mới",
    align: "right",
    format: num,
  },
];

/** Phân tích › Khách Hàng › Chi Tiết. */
export function ChiTietPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
    axis: "month",
    columns: "month",
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } = useDlclReport<ChiTietReport>(
    "chi-tiet",
    filters,
  );
  const expand = useDlclExpand("chi-tiet", filters);
  const metric = filters.metric ?? "amount";

  return (
    <>
      <DlclFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        status={<DlclPeriodBadge period={data?.period} fetching={isFetching} />}
      />
      <DlclBody
        data={data}
        isLoading={isLoading}
        error={error}
        year={filters.year}>
        {(d) => (
          <>
            {d.productFiltered && (
              <DlclNote>
                Đang lọc theo hàng: số liệu tính theo các dòng hàng thuộc bộ
                lọc. Bảng theo nhóm khách (trừ Sản Lượng) vẫn tính trên toàn bộ
                hoá đơn, giống Power BI.
              </DlclNote>
            )}
            <div className="grid gap-3 2xl:grid-cols-2">
              <Panel title="Tình hình kinh doanh theo nhóm khách">
                {d.byType && (
                  <AnalyticsTable
                    columns={TYPE_COLUMNS}
                    rows={d.byType.rows}
                    totals={{ ...d.byType.total, customerType: null }}
                    rowKey={(r) => r.customerType ?? "_"}
                  />
                )}
              </Panel>
              <Panel
                title="Tình hình mua hàng của khách"
                subtitle={`${metricTitle(metric)} năm ${filters.year} so với năm ${filters.year - 1}`}
                right={
                  <AxisSeg
                    value={filters.axis ?? "month"}
                    options={AXIS_OPTIONS}
                    onChange={(axis) => setFilters((f) => ({ ...f, axis }))}
                  />
                }>
                <TrendLineChart points={d.trend} metric={metric} />
              </Panel>
            </div>
            <Panel
              title="Tổng hợp doanh số theo khách hàng"
              subtitle="Bấm vào khách cha để xem từng sản phẩm"
              right={
                <AxisSeg
                  value={filters.columns ?? "month"}
                  options={COLUMN_OPTIONS}
                  onChange={(columns) => setFilters((f) => ({ ...f, columns }))}
                />
              }>
              {d.pivot && (
                <DlclPivotTable
                  key={JSON.stringify(filters)}
                  pivot={d.pivot}
                  rowHeader="Tên Khách Cha / Tên Sản Phẩm"
                  metric={metric}
                  labels={{ value: "Giá trị", mom: "Tăng trưởng MoM (%)" }}
                  onExpand={expand}
                  maxHeight={640}
                />
              )}
            </Panel>
          </>
        )}
      </DlclBody>
    </>
  );
}
