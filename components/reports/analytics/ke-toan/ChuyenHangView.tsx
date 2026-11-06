"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import type { TransferFilters, TransferRow } from "@/lib/api/analytics-ke-toan";
import { useChuyenHang } from "@/lib/hooks/useAnalyticsKeToan";
import {
  ExportButton,
  exportSheets,
  fmtDate,
  fmtDec1,
  fmtInt,
  LoadState,
  PagedTable,
  UpdatedAt,
  type KeToanColumn,
} from "./KeToanShared";

/** Định dạng có điều kiện của Power BI: nền cột Mã Hàng theo [LÝ DO CẢNH BÁO]. */
const REASON_BG: Record<string, string> = {
  "Dưới điểm điều chuyển": "#f0e199",
  "Dưới tồn an toàn": "#efb5b9",
  "Đơn hàng xác nhận > tồn khả dụng": "#D64550",
  "Đủ hàng": "#E2F0D9",
};

const int = (
  key: keyof TransferRow,
  label: string,
): KeToanColumn<TransferRow> => ({
  key,
  label,
  align: "right",
  sortable: true,
  format: fmtInt,
});
const dec = (
  key: keyof TransferRow,
  label: string,
): KeToanColumn<TransferRow> => ({
  key,
  label,
  align: "right",
  sortable: true,
  format: fmtDec1,
});

const COLUMNS: KeToanColumn<TransferRow>[] = [
  {
    key: "code",
    label: "Mã Hàng",
    sortable: true,
    background: (_, r) => (r.code ? REASON_BG[r.reason] : undefined),
    color: (_, r) =>
      r.code && r.reason === "Đơn hàng xác nhận > tồn khả dụng"
        ? "#fff"
        : undefined,
  },
  { key: "name", label: "Tên Hàng", sortable: true, width: 300 },
  int("onhandHn", "Tồn HN"),
  int("onhandSg", "Tồn SG"),
  int("sale5", "Bán 5N"),
  int("sale30", "Bán 30N"),
  int("sale90", "Bán 90N"),
  int("transfer", "Hàng đang chuyển"),
  int("reservedSg", "Hàng giữ/đã cam kết SG"),
  int("reservedHn", "Hàng giữ/đã cam kết HN"),
  int("confirmed", "Đơn hàng xác nhận"),
  dec("avg5", "BQ5/ngày"),
  dec("avg30", "BQ30/ngày"),
  dec("avg90", "BQ90/ngày"),
  dec("demand", "Demand/ngày"),
  dec("safe", "Tồn an toàn"),
  int("point", "Điểm điều chuyển"),
  dec("available", "Tồn khả dụng SG"),
  dec("target", "Tồn mục tiêu"),
  int("rec", "SL HỆ THỐNG ĐỀ XUẤT (gói)"),
  int("bulk", "SL HỆ THỐNG ĐỀ XUẤT (thùng)"),
  { key: "warning", label: "Cảnh Báo", sortable: true },
  { key: "reason", label: "LÝ DO CẢNH BÁO", sortable: true },
  { key: "hnOutbound", label: "KHẢ NĂNG XUẤT HN", sortable: true },
];

/**
 * Phân tích › Kế Toán › Chuyển Hàng — tableEx "Điều chuyển hàng Hà Nội -> Sài Gòn".
 * Slicer Chi Nhánh / Ngày của trang Power BI đặt trên packing_slips nên không
 * tác động bảng này → chỉ giữ slicer Tên Hàng.
 */
export function ChuyenHangView() {
  const [filters, setFilters] = useState<TransferFilters>({});
  const { data, isLoading, isFetching, error } = useChuyenHang(filters);

  const totals: TransferRow | null = data?.totals
    ? { ...data.totals, code: "", name: "" }
    : null;
  const w = data?.windows;
  const win = (x?: { from: string; to: string }) =>
    x ? `${fmtDate(x.from).slice(0, 5)}–${fmtDate(x.to).slice(0, 5)}` : "";

  return (
    <>
      <div className="dt-panel p-4 flex flex-wrap items-center gap-3">
        <div className="w-96">
          <FilterMultiSelect
            options={(data?.productNames ?? []).map((n) => ({
              value: n,
              label: n,
            }))}
            values={filters.productNames ?? []}
            onChange={(vals) =>
              setFilters({ productNames: vals.length ? vals : undefined })
            }
            placeholder="Tên Hàng: Tất cả"
            searchPlaceholder="Tìm tên hàng..."
            multiLabel={(n) => `Tên Hàng: ${n} mặt hàng`}
            panelWidth={440}
          />
        </div>
        {!!filters.productNames?.length && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          {Object.entries(REASON_BG).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm border"
                style={{ background: c, borderColor: "var(--dt-border)" }}
              />
              {k}
            </span>
          ))}
        </div>
        {isFetching && (
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "var(--dt-text-muted)" }}
          />
        )}
      </div>

      <LoadState error={error} loading={isLoading || !data}>
        {data && (
          <Panel
            title="Điều chuyển hàng Hà Nội -> Sài Gòn"
            subtitle={`Tính đến hết ${fmtDate(w?.d5.to)} (bỏ Chủ Nhật, theo ngày báo đơn của hoá đơn Kho Sài Gòn) · Bán 5N: ${win(w?.d5)} · 30N: ${win(w?.d30)} · 90N: ${win(w?.d90)}`}
            right={
              <ExportButton
                disabled={!data.rows.length}
                onExport={() =>
                  exportSheets("Chuyen-Hang-HN-SG", [
                    {
                      name: "Điều chuyển HN - SG",
                      columns: COLUMNS,
                      rows: data.rows,
                      totals,
                    },
                  ])
                }
              />
            }>
            <PagedTable
              columns={COLUMNS}
              rows={data.rows}
              totals={totals}
              rowKey={(r) => r.code}
              maxHeight={680}
            />
          </Panel>
        )}
      </LoadState>
      <UpdatedAt at={data?.updatedAt} />
    </>
  );
}
