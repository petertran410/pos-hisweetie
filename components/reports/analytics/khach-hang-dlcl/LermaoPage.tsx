"use client";

import { useMemo, useState } from "react";
import { Panel } from "../shared/AnalyticsCharts";
import { FilterMultiSelect } from "@/components/ui/filters";
import type {
  DlclFilters,
  LermaoReport,
  Pivot,
} from "@/lib/api/analytics-khach-hang-dlcl";
import {
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { DlclBody, DlclNote, DlclPeriodBadge } from "./DlclPageFrame";

/** Phân tích › Khách Hàng › ĐLCL Lermao — sản lượng Lermao theo từng đại lý chiến lược. */
export function LermaoPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } = useDlclReport<LermaoReport>(
    "dlcl-lermao",
    filters,
  );

  // Bảng KHCL Lermao → matrix: hàng Danh mục › Tên hàng, mỗi đại lý 1 cột (Total Quantity).
  const pivot = useMemo<Pivot | null>(() => {
    if (!data?.period) return null;
    return {
      columns: data.columns.map((c) => ({ key: String(c.id), label: c.name })),
      measures: ["quantity"],
      rows: data.rows.map((r) => ({
        label: r.label,
        cells: r.cells.map((v) => [v]),
        children: r.children.map((c) => ({
          label: c.label,
          cells: c.cells.map((v) => [v]),
        })),
      })),
      total: data.total.map((v) => [v]),
    };
  }, [data]);

  const columnPicker = (
    <div className="w-56">
      <FilterMultiSelect
        options={(data?.distributors ?? []).map((d) => ({
          value: String(d.id),
          label: d.name,
        }))}
        values={(filters.distributorIds ?? []).map(String)}
        onChange={(vals) =>
          setFilters((f) => ({
            ...f,
            distributorIds: vals.length ? vals.map(Number) : undefined,
          }))
        }
        placeholder="Cột ĐLCL: Tất cả"
        multiLabel={(n) => `${n} cột ĐLCL`}
      />
    </div>
  );

  return (
    <>
      <DlclFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        hideMetric
        extra={columnPicker}
        keep={["distributorIds"]}
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
              Sản lượng hàng <b>{d.program.productType ?? "mọi ngành hàng"}</b>{" "}
              · <b>{d.program.brand ?? "mọi thương hiệu"}</b> của từng đại lý
              chiến lược. Danh sách đại lý và mã khách sửa ở Phân tích › Cấu
              hình › ĐLCL.
            </DlclNote>
            <Panel
              title="Tình Hình Mua Hàng Của ĐLCL"
              subtitle="Số lượng hàng (Total Quantity)">
              {pivot && (
                <DlclPivotTable
                  key={JSON.stringify(filters)}
                  pivot={pivot}
                  rowHeader="Danh Mục / Tên Hàng"
                  metric="quantity"
                  heat
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
