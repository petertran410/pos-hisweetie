"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "../shared/AnalyticsCharts";
import { BLANK_LABEL, metricTitle } from "../analyticsFormat";
import {
  analyticsDlclApi,
  type DlclFilters,
  type XuatDataReport,
} from "@/lib/api/analytics-khach-hang-dlcl";
import {
  useDlclExpand,
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { downloadCsv } from "./dlclFormat";
import { DlclBody, DlclPeriodBadge } from "./DlclPageFrame";

/** Phân tích › Khách Hàng › Xuất Data (> 12 tháng): khách cha × sản phẩm × năm-tháng. */
export function XuatDataPage() {
  const thisYear = new Date().getFullYear();
  const [filters, setFilters] = useState<DlclFilters>({
    year: thisYear,
    years: [thisYear - 1, thisYear],
    metric: "amount",
  });
  const [exporting, setExporting] = useState(false);
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } = useDlclReport<XuatDataReport>(
    "xuat-data",
    filters,
  );
  const expand = useDlclExpand("xuat-data", filters);
  const metric = filters.metric ?? "amount";

  // Tải toàn bộ khách cha × sản phẩm (kể cả hàng chưa mở rộng) ra CSV.
  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await analyticsDlclApi.get<XuatDataReport>("xuat-data", {
        ...filters,
        full: true,
      });
      const pv = res.pivot;
      if (!pv) return;
      const head = [
        "Tên Khách Cha",
        "Tên Sản Phẩm",
        ...pv.columns.map((c) =>
          c.group ? `${c.group} ${c.label}` : (c.label ?? ""),
        ),
      ];
      const lines: (string | number | null)[][] = [head];
      for (const r of pv.rows) {
        lines.push([r.label ?? BLANK_LABEL, "", ...r.cells.map((c) => c[0])]);
        for (const ch of r.children ?? []) {
          lines.push([
            r.label ?? BLANK_LABEL,
            ch.label ?? BLANK_LABEL,
            ...ch.cells.map((c) => c[0]),
          ]);
        }
      }
      lines.push(["Tổng", "", ...pv.total.map((c) => c[0])]);
      const years = (filters.years ?? [filters.year]).join("-");
      downloadCsv(`xuat-data-khach-hang-${years}-${metric}.csv`, lines);
    } catch (e) {
      toast.error((e as Error).message || "Không xuất được dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <DlclFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        multiYear
        status={<DlclPeriodBadge period={data?.period} fetching={isFetching} />}
      />
      <DlclBody
        data={data}
        isLoading={isLoading}
        error={error}
        year={filters.year}>
        {(d) => (
          <Panel
            title="Tổng hợp doanh số theo khách hàng"
            subtitle={`${metricTitle(metric)} theo năm › tháng · bấm vào khách cha để xem từng sản phẩm`}
            right={
              <button
                type="button"
                onClick={exportAll}
                disabled={exporting || !d.pivot?.rows.length}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px] disabled:opacity-50">
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Tải CSV (đủ sản phẩm)
              </button>
            }>
            {d.pivot && (
              <DlclPivotTable
                key={JSON.stringify(filters)}
                pivot={d.pivot}
                rowHeader="Tên Khách Cha / Tên Sản Phẩm"
                metric={metric}
                onExpand={expand}
                maxHeight={680}
              />
            )}
          </Panel>
        )}
      </DlclBody>
    </>
  );
}
