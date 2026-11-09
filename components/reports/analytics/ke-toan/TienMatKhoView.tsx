"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import type { CashFilters } from "@/lib/api/analytics-ke-toan";
import { useTienMatKho } from "@/lib/hooks/useAnalyticsKeToan";
import {
  BranchDateFilter,
  ExportButton,
  exportSheets,
  fmtDate,
  fmtInt,
  LoadState,
  PagedTable,
  textOrBlank,
  UpdatedAt,
  type KeToanColumn,
} from "./KeToanShared";

interface PivotRow {
  date: string;
  code: string;
  customerName: string | null;
  byBranch: Record<string, number>;
  total: number;
}

/**
 * Phân tích › Kế Toán › Tiền Mặt - Kho — pivot "Tiền Mặt - Kho":
 * cột Chi Nhánh, dòng Ngày Tạo › Mã Báo Đơn › Tên Khách, giá trị Tiền Mặt
 * (không tổng phụ theo dòng, có cột "Tổng"). Sắp Ngày Tạo giảm dần.
 */
export function TienMatKhoView() {
  const [filters, setFilters] = useState<CashFilters>({});
  const { data, isLoading, isFetching, error } = useTienMatKho(filters);

  const { rows, totals, columns } = useMemo(() => {
    const branches = data?.columns ?? [];
    const map = new Map<string, PivotRow>();
    for (const r of data?.rows ?? []) {
      const k = `${r.date}|${r.code}|${r.customerName ?? ""}`;
      let row = map.get(k);
      if (!row) {
        row = {
          date: r.date,
          code: r.code,
          customerName: r.customerName,
          byBranch: {},
          total: 0,
        };
        map.set(k, row);
      }
      const b = r.branch ?? "";
      row.byBranch[b] = (row.byBranch[b] ?? 0) + r.amount;
      row.total += r.amount;
    }
    const list = [...map.values()];
    const tot: PivotRow = {
      date: "",
      code: "",
      customerName: null,
      byBranch: {},
      total: 0,
    };
    for (const r of list) {
      for (const [b, v] of Object.entries(r.byBranch))
        tot.byBranch[b] = (tot.byBranch[b] ?? 0) + v;
      tot.total += r.total;
    }
    const cols: KeToanColumn<PivotRow>[] = [
      {
        key: "date",
        label: "Ngày Tạo",
        sortable: true,
        format: (v) => (v ? fmtDate(v) : ""),
        exportValue: (r) => (r.date ? fmtDate(r.date) : "Tổng"),
      },
      { key: "code", label: "Mã Báo Đơn", sortable: true },
      {
        key: "customerName",
        label: "Tên Khách",
        sortable: true,
        format: (v, r) => (r.code ? textOrBlank(v) : ""),
      },
      ...branches.map<KeToanColumn<PivotRow>>((b) => ({
        key: `b:${b}`,
        label: b || "(Trống)",
        align: "right",
        sortable: true,
        value: (r) => r.byBranch[b] ?? null,
        format: fmtInt,
      })),
      {
        key: "total",
        label: "Tổng",
        align: "right",
        sortable: true,
        format: fmtInt,
      },
    ];
    return { rows: list, totals: list.length ? tot : null, columns: cols };
  }, [data]);

  return (
    <>
      <BranchDateFilter
        branches={data?.branches ?? []}
        branch={filters.branch}
        from={filters.from}
        to={filters.to}
        onChange={setFilters}
        right={
          isFetching && (
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "var(--dt-text-muted)" }}
            />
          )
        }
      />
      <LoadState error={error} loading={isLoading || !data}>
        {data && (
          <Panel
            title="Tiền Mặt - Kho"
            subtitle={`${rows.length.toLocaleString("vi-VN")} phiếu báo đơn thu tiền mặt${
              data.dateRange.min
                ? ` · dữ liệu từ ${fmtDate(data.dateRange.min)} đến ${fmtDate(data.dateRange.max)}`
                : ""
            }`}
            right={
              <ExportButton
                disabled={!rows.length}
                onExport={() =>
                  exportSheets("Tien-Mat-Kho", [
                    { name: "Tiền Mặt - Kho", columns, rows, totals },
                  ])
                }
              />
            }>
            <PagedTable
              columns={columns}
              rows={rows}
              totals={totals}
              rowKey={(r) => `${r.date}|${r.code}|${r.customerName ?? ""}`}
            />
          </Panel>
        )}
      </LoadState>
      <UpdatedAt at={data?.updatedAt} />
    </>
  );
}
