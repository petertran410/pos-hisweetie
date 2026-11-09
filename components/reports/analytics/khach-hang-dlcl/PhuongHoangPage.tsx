"use client";

import { useState } from "react";
import { HBarChart, Panel } from "../shared/AnalyticsCharts";
import { BLANK_LABEL } from "../analyticsFormat";
import type {
  DlclFilters,
  PhuongHoangReport,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { DT_COLORS } from "@/lib/dashboard/format";
import {
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { DlclDetailTable } from "./DlclDetailTable";
import { TrendLineChart } from "./DlclCharts";
import {
  AXIS_OPTIONS,
  AxisSeg,
  DlclBody,
  DlclNote,
  DlclPeriodBadge,
} from "./DlclPageFrame";

/** Phân tích › Khách Hàng › ĐLCL Phượng Hoàng — khách nhóm "KH ĐL Trà Phượng Hoàng", hàng Phượng Hoàng. */
export function PhuongHoangPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
    axis: "month",
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } =
    useDlclReport<PhuongHoangReport>("dlcl-phuong-hoang", filters);
  const metric = filters.metric ?? "amount";
  const tableKey = JSON.stringify(filters);

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
            <DlclNote>
              Khách thuộc nhóm{" "}
              <b>{d.program.customerGroupName ?? "(chưa cấu hình)"}</b>, hàng{" "}
              <b>{d.program.productType}</b> · <b>{d.program.brand}</b>.
            </DlclNote>
            <div className="grid gap-3 xl:grid-cols-[2fr_3fr]">
              <Panel title="Top 5 sản phẩm bán chạy của KH Ưu tiên Phượng Hoàng">
                <HBarChart
                  rows={d.top5.map((t) => ({
                    name: t.name ?? BLANK_LABEL,
                    value: t.value,
                  }))}
                  metric={metric}
                  color={DT_COLORS.primaryMid}
                />
              </Panel>
              <Panel
                title="Xu hướng doanh số KH Ưu tiên Phượng Hoàng"
                right={
                  <AxisSeg
                    value={filters.axis ?? "month"}
                    options={AXIS_OPTIONS}
                    onChange={(axis) => setFilters((f) => ({ ...f, axis }))}
                  />
                }>
                <TrendLineChart
                  points={d.trend.map((p) => ({
                    label: p.label,
                    value: p.value,
                  }))}
                  metric={metric}
                  currentLabel="Giá trị"
                />
              </Panel>
            </div>
            <Panel title="Tình hình kinh doanh của KH Ưu tiên Phượng Hoàng">
              {d.byCustomer && (
                <DlclPivotTable
                  key={`c-${tableKey}`}
                  pivot={d.byCustomer}
                  rowHeader="Tên Khách Cha / Tên Hàng Hóa"
                  metric={metric}
                  labels={{ value: "Giá trị", mom: "Tăng trưởng (%)" }}
                />
              )}
            </Panel>
            <Panel title="Các sản phẩm đã bán được cho KH Ưu tiên">
              {d.byProduct && (
                <DlclPivotTable
                  key={`p-${tableKey}`}
                  pivot={d.byProduct}
                  rowHeader="Tên hàng / Tên Khách Cha"
                  metric="quantity"
                  labels={{ quantity: "Số lượng hàng" }}
                  maxHeight={440}
                />
              )}
            </Panel>
            <Panel title="Báo cáo chi tiết doanh số sản phẩm KH Ưu tiên Phượng Hoàng">
              {d.detail && (
                <DlclDetailTable
                  detail={d.detail}
                  filename={`dlcl-phuong-hoang-${filters.year}.csv`}
                  fields={[
                    "date",
                    "invoiceCode",
                    "customerCode",
                    "customerName",
                    "productCode",
                    "productName",
                    "quantity",
                    "price",
                    "discount",
                    "amount",
                    "free",
                    "parentName",
                  ]}
                />
              )}
            </Panel>
          </>
        )}
      </DlclBody>
    </>
  );
}
