"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  ChuyenKhoCell,
  LoaiBCell,
  MuaHangFilters,
} from "@/lib/api/analytics-mua-hang";
import {
  useChuyenKho,
  useHangLoaiB,
  useMuaHangFilterOptions,
} from "@/lib/hooks/useAnalyticsMuaHang";
import { Panel } from "../shared/AnalyticsCharts";
import { MuaHangPivot, type PivotMeasure } from "./MuaHangPivot";
import { MuaHangSlicers, type SlicerSet } from "./MuaHangSlicers";
import { fmtDate, fmtQty } from "./muaHangFormat";
import { ErrorBox, LoadingBlock, UpdatedAt } from "./MuaHangCommon";

// Báo cáo Chuyển Kho (Power BI "Báo Cáo Chuyển Kho"): 2 trang dùng chung slicer.
const SLICERS: SlicerSet = {
  branches: "warehouses",
  productTypes: true,
  brands: true,
  visualGroups: true,
  groups2026: true,
  categories: true,
  products: true,
};
const SNAPSHOT_NOTE =
  "Số tồn kho, đặt NCC, khách đặt, hàng trên đường là số hiện tại nên không lọc theo năm / tháng (slicer Năm, Tháng của Power BI không tác động tới các số này).";

const SALE_NOTE =
  "Sản lượng 90 ngày tính đúng 90 ngày gần nhất theo ngày hoá đơn (ở Power BI bảng ngày không nối với hoá đơn nên số này thực chất là tổng bán từ trước tới nay).";

const negColor = (v: number | null | undefined) =>
  v !== null && v !== undefined && v < 0 ? "#C0392B" : undefined;

const qtyMeasure = <C,>(
  key: string,
  label: string,
  get: (c: C | undefined) => number | null | undefined,
): PivotMeasure<C> => ({ key, label, get, format: fmtQty, color: negColor });

/** Trang Chuyển Kho › Chuyển Kho: pivot "Dữ Liệu Chuyển Kho 2 Miền". */
export function ChuyenKhoView() {
  const [filters, setFilters] = useState<MuaHangFilters>({});
  const { data: options } = useMuaHangFilterOptions();
  const { data, isLoading, isFetching, error } = useChuyenKho(filters);

  const measures: PivotMeasure<ChuyenKhoCell>[] = [
    qtyMeasure("onhand", "Tồn Kho", (c) => c?.onhand),
    qtyMeasure("onorder", "Đặt NCC", (c) => c?.onorder),
    qtyMeasure("reserved", "Khách Đặt", (c) => c?.reserved),
    qtyMeasure("transfer", "Hàng Trên Đường", (c) => c?.transfer),
    qtyMeasure("sale", "Sản Lượng 90 ngày", (c) => c?.sale),
    {
      key: "avg",
      label: "Sản Lượng Trung Bình",
      get: (c) => c?.avgSale,
      format: (v) =>
        v === null || v === undefined
          ? ""
          : v.toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
    },
  ];

  return (
    <>
      <MuaHangSlicers
        show={SLICERS}
        filters={filters}
        onChange={setFilters}
        options={options}
        defaultFilters={{}}
        note={`${SNAPSHOT_NOTE} ${SALE_NOTE}`}
      />
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <Panel
          title="Dữ Liệu Chuyển Kho 2 Miền"
          subtitle={`Sản lượng 90 ngày: hoá đơn từ ${fmtDate(data.saleRange.from)} đến ${fmtDate(
            data.saleRange.to,
          )}; Sản lượng trung bình = Sản lượng 90 ngày / ${data.saleRange.days}.`}
          right={
            isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : undefined
          }>
          <MuaHangPivot
            rowHeaders={["Nhóm Hàng / Mã Hàng", "Tên Hàng"]}
            colGroups={data.branches.map((b) => ({ key: b, label: b }))}
            measures={measures}
            groups={data.groups.map((g) => ({
              key: g.group,
              label: g.group,
              cells: g.cells,
              total: g.total,
              children: data.rows
                .filter((r) => r.group === g.group)
                .map((r) => ({
                  key: r.code,
                  labels: [r.code, r.name],
                  cells: r.cells,
                  total: r.total,
                })),
            }))}
            total={data.total}
            totalColLabel="Tổng 2 kho"
            maxHeight={680}
          />
          <UpdatedAt at={data.updatedAt} count={data.rows.length} />
        </Panel>
      )}
    </>
  );
}

/** Trang Chuyển Kho › Hàng Loại B: cận date / bục rách / khuyến mãi theo kho. */
export function HangLoaiBView() {
  const [filters, setFilters] = useState<MuaHangFilters>({});
  const { data: options } = useMuaHangFilterOptions();
  const { data, isLoading, isFetching, error } = useHangLoaiB(filters);

  const measures: PivotMeasure<LoaiBCell>[] = [
    qtyMeasure("near", "Cận Date", (c) => c?.nearExp),
    qtyMeasure("damaged", "Bục Rách", (c) => c?.damaged),
    qtyMeasure("promo", "Khuyến Mãi", (c) => c?.promo),
  ];

  return (
    <>
      <MuaHangSlicers
        show={SLICERS}
        filters={filters}
        onChange={setFilters}
        options={options}
        defaultFilters={{}}
        note={SNAPSHOT_NOTE}
      />
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <Panel
          title="Dữ Liệu Chuyển Kho 2 Miền"
          subtitle="Hàng loại B tại Kho Sài Gòn / Kho Hà Nội; chỉ hiện mã có số khác 0."
          right={
            isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : undefined
          }>
          <MuaHangPivot
            rowHeaders={["Mã Hàng", "Tên Hàng"]}
            colGroups={data.branches.map((b) => ({ key: b, label: b }))}
            measures={measures}
            rows={data.rows.map((r) => ({
              key: r.code,
              labels: [r.code, r.name],
              cells: r.cells,
              total: r.total,
            }))}
            total={data.total}
            totalColLabel="Tổng 2 kho"
          />
          <UpdatedAt at={data.updatedAt} count={data.rows.length} />
        </Panel>
      )}
    </>
  );
}
