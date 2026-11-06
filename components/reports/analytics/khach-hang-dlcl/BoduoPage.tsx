"use client";

import { useMemo, useState } from "react";
import { DonutChart, Panel } from "../shared/AnalyticsCharts";
import { BLANK_LABEL } from "../analyticsFormat";
import type {
  BoduoReport,
  DlclFilters,
  Pivot,
} from "@/lib/api/analytics-khach-hang-dlcl";
import {
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { DlclDetailTable } from "./DlclDetailTable";
import { TrendLineChart } from "./DlclCharts";
import { DlclBody, DlclNote, DlclPeriodBadge } from "./DlclPageFrame";

const TITLE = "Doanh số sản phẩm BODUO của các khách hàng KEY được chiết khấu";

/** Phân tích › Khách Hàng › ĐLCL Boduo — khách nhóm "KH ĐL BODUO", hàng thương mại Boduo. */
export function BoduoPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } = useDlclReport<BoduoReport>(
    "dlcl-boduo",
    filters,
  );
  const metric = filters.metric ?? "amount";
  const tableKey = JSON.stringify(filters);

  // "Danh Mục Hàng Boduo": hàng = tháng, cột = danh mục (Top 5 sản phẩm).
  const byCategory = useMemo<Pivot | null>(() => {
    const c = data?.byCategory;
    if (!c) return null;
    return {
      columns: c.columns,
      measures: ["value", "mom"],
      rows: c.rows.map((r) => ({
        label: r.label,
        cells: r.cells.map((x) => [x[0], x[1]]),
      })),
      total: c.total,
    };
  }, [data]);

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
              <b>{d.program.productType}</b> · <b>{d.program.brand}</b>. Biểu đồ
              tròn giữ đúng Power BI: lọc khách <b>VIP Cty</b> (không phải nhóm
              Boduo).
            </DlclNote>
            <Panel title="Tình hình kinh doanh sản phẩm BODUO của các khách hàng KEY được chiết khấu">
              {d.byCustomer && (
                <DlclPivotTable
                  key={`c-${tableKey}`}
                  pivot={d.byCustomer}
                  rowHeader="Tên khách"
                  metric={metric}
                  labels={{ value: "Giá trị", mom: "Tăng trưởng (%)" }}
                />
              )}
            </Panel>
            <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
              <Panel title={TITLE} subtitle="Theo tháng">
                <TrendLineChart
                  points={d.trend.map((p) => ({
                    label: p.label,
                    value: p.value,
                  }))}
                  metric={metric}
                  currentLabel="Giá trị"
                />
              </Panel>
              <Panel
                title={TITLE}
                subtitle="Theo danh mục hàng · khách VIP Cty">
                <DonutChart
                  rows={d.pie.map((p) => ({
                    name: p.name ?? BLANK_LABEL,
                    value: p.value,
                  }))}
                  metric={metric}
                />
              </Panel>
            </div>
            <Panel
              title="Danh Mục Hàng Boduo"
              subtitle="Top 5 sản phẩm theo chỉ số đang chọn">
              {byCategory && (
                <DlclPivotTable
                  key={`k-${tableKey}`}
                  pivot={byCategory}
                  rowHeader="Tháng"
                  metric={metric}
                  labels={{ value: "Giá trị", mom: "Tăng Trưởng (%)" }}
                />
              )}
            </Panel>
            <Panel title="Báo cáo chi tiết doanh số sản phẩm BODUO của các khách hàng KEY được chiết khấu">
              {d.detail && (
                <DlclDetailTable
                  detail={d.detail}
                  filename={`dlcl-boduo-${filters.year}.csv`}
                  fields={[
                    "date",
                    "invoiceCode",
                    "customerCode",
                    "customerName",
                    "productCode",
                    "productName",
                    "quantity",
                    "amount",
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
