"use client";

import { useState } from "react";
import { Panel } from "../shared/AnalyticsCharts";
import type {
  DlclFilters,
  MutLermaoReport,
} from "@/lib/api/analytics-khach-hang-dlcl";
import {
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { DlclDetailTable } from "./DlclDetailTable";
import { MomWaterfall } from "./DlclCharts";
import { DlclBody, DlclNote, DlclPeriodBadge } from "./DlclPageFrame";

/** Phân tích › Khách Hàng › ĐLCL Mứt Lermao — khách thuộc nhóm "KH ĐLCL Mứt Lermao", mọi mặt hàng. */
export function MutLermaoPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
    metric: "amount",
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } = useDlclReport<MutLermaoReport>(
    "dlcl-mut-lermao",
    filters,
  );
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
              <b>{d.program.customerGroupName ?? "(chưa cấu hình)"}</b>. “Tính
              toán bởi” chỉ đổi cột Tăng Trưởng MoM và biểu đồ tăng trưởng; MoM
              so với tháng liền trước (tháng 1 so với tháng 12 năm trước).
            </DlclNote>
            <Panel title="Tổng Hợp Theo Khách Hàng">
              {d.byCustomer && (
                <DlclPivotTable
                  key={`c-${tableKey}`}
                  pivot={d.byCustomer}
                  rowHeader="Tên khách cha / Tên Hàng"
                  metric={metric}
                />
              )}
            </Panel>
            <Panel title="Tổng Hợp Theo Hàng Hóa">
              {d.byProduct && (
                <DlclPivotTable
                  key={`p-${tableKey}`}
                  pivot={d.byProduct}
                  rowHeader="Tên Hàng / Tên khách cha"
                  metric={metric}
                  labels={{
                    amount: "Tổng tiền hàng",
                    quantity: "Số lượng hàng",
                    mom: "Tăng trưởng MoM (%)",
                  }}
                />
              )}
            </Panel>
            <Panel
              title="Tình Hình Tăng Trưởng Qua Tháng"
              subtitle="Tăng Trưởng MoM (%)">
              <MomWaterfall points={d.growth} />
            </Panel>
            <Panel title="Báo cáo chi tiết doanh số sản phẩm Mứt Lermao của các khách hàng chiến lược">
              {d.detail && (
                <DlclDetailTable
                  detail={d.detail}
                  filename={`dlcl-mut-lermao-${filters.year}.csv`}
                  fields={[
                    "date",
                    "invoiceCode",
                    "customerName",
                    "customerCode",
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
