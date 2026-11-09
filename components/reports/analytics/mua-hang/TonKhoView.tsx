"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  MuaHangFilters,
  PromoCell,
  StockCell,
  StockGroupRow,
} from "@/lib/api/analytics-mua-hang";
import {
  useMuaHangFilterOptions,
  useTonKho,
} from "@/lib/hooks/useAnalyticsMuaHang";
import { Panel } from "../shared/AnalyticsCharts";
import { FLAT_COLS, MuaHangPivot, type PivotMeasure } from "./MuaHangPivot";
import { MuaHangSlicers, type SlicerSet } from "./MuaHangSlicers";
import { BLANK_LABEL, fmtQty } from "./muaHangFormat";
import { ErrorBox, LoadingBlock, UpdatedAt } from "./MuaHangCommon";

// Thu Mua › Tồn Kho (report đi kèm dataset_purchasing). Gộp cả trang "Tồn kho" thứ 2
// (bảng hàng khuyến mãi / cận date theo kho).
const SLICERS: SlicerSet = {
  branches: "warehouses",
  productTypes: true,
  brands: true,
  visualGroups: true,
  groups2026: true,
  categories: true,
};

const negColor = (v: number | null | undefined) =>
  v !== null && v !== undefined && v < 0 ? "#C0392B" : undefined;

const STOCK_MEASURES: PivotMeasure<StockCell>[] = [
  {
    key: "onhand",
    label: "Tồn kho",
    get: (c) => c?.onhand,
    format: fmtQty,
    color: negColor,
  },
  { key: "onorder", label: "Đặt NCC", get: (c) => c?.onorder, format: fmtQty },
  {
    key: "reserved",
    label: "Khách đặt",
    get: (c) => c?.reserved,
    format: fmtQty,
  },
];

const PROMO_MEASURES: PivotMeasure<PromoCell>[] = [
  {
    key: "promo",
    label: "Khuyến Mãi",
    get: (c) => c?.promo,
    format: fmtQty,
    color: negColor,
  },
  {
    key: "near",
    label: "Cận Date",
    get: (c) => c?.nearExp,
    format: fmtQty,
    color: negColor,
  },
];

function SmallTable({
  title,
  header,
  rows,
  total,
}: {
  title: string;
  header: string;
  rows: StockGroupRow[];
  total: StockCell;
}) {
  return (
    <Panel title={title}>
      <MuaHangPivot
        rowHeaders={[header]}
        colGroups={FLAT_COLS}
        measures={STOCK_MEASURES}
        rows={rows.map((r) => ({
          key: r.key ?? "__blank__",
          labels: [r.key ?? BLANK_LABEL],
          cells: {},
          total: r,
        }))}
        total={{ cells: {}, total }}
        maxHeight={360}
      />
    </Panel>
  );
}

export function TonKhoView() {
  const [filters, setFilters] = useState<MuaHangFilters>({});
  const { data: options } = useMuaHangFilterOptions();
  const { data, isLoading, isFetching, error } = useTonKho(filters);

  const originGroups = (() => {
    if (!data) return [];
    const map = new Map<
      string,
      { origin: string | null; rows: typeof data.byOrigin }
    >();
    for (const r of data.byOrigin) {
      const k = r.origin ?? "__blank__";
      if (!map.has(k)) map.set(k, { origin: r.origin, rows: [] });
      map.get(k)!.rows.push(r);
    }
    const sum = (rows: StockCell[]): StockCell => {
      const add = (a: number | null, b: number | null) =>
        a === null ? b : b === null ? a : a + b;
      return rows.reduce<StockCell>(
        (s, r) => ({
          onhand: add(s.onhand, r.onhand),
          onorder: add(s.onorder, r.onorder),
          reserved: add(s.reserved, r.reserved),
        }),
        { onhand: null, onorder: null, reserved: null },
      );
    };
    return [...map.entries()]
      .sort((a, b) =>
        (a[1].origin ?? "").localeCompare(b[1].origin ?? "", "vi"),
      )
      .map(([k, g]) => ({
        key: k,
        label: g.origin ?? BLANK_LABEL,
        cells: {},
        total: sum(g.rows),
        children: g.rows
          .slice()
          .sort((a, b) =>
            (a.category ?? "").localeCompare(b.category ?? "", "vi"),
          )
          .map((r) => ({
            key: r.category ?? "__blank__",
            labels: [r.category ?? BLANK_LABEL],
            cells: {},
            total: r as StockCell,
          })),
      }));
  })();

  return (
    <>
      <MuaHangSlicers
        show={SLICERS}
        filters={filters}
        onChange={setFilters}
        options={options}
        defaultFilters={{}}
        right={
          isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : undefined
        }
        note="Chỉ hàng đang kinh doanh (filter Power BI is_active = true). Số tồn là số hiện tại tại Kho Sài Gòn / Kho Hà Nội, không lọc theo năm / tháng."
      />
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock blocks={2} />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            <SmallTable
              title="Theo Kho"
              header="Kho"
              rows={data.byBranch}
              total={data.total}
            />
            <SmallTable
              title="Theo Nhóm Hàng"
              header="Nhóm Hàng"
              rows={data.byVisualGroup}
              total={data.total}
            />
            <SmallTable
              title="Theo Loại Hàng"
              header="Loại Hàng"
              rows={data.byProductType}
              total={data.total}
            />
          </div>
          <Panel title="Theo Nguồn Gốc">
            <MuaHangPivot
              rowHeaders={["Nguồn Gốc / Danh Mục"]}
              colGroups={FLAT_COLS}
              measures={STOCK_MEASURES}
              groups={originGroups}
              total={{ cells: {}, total: data.total }}
              maxHeight={420}
              defaultCollapsed
            />
          </Panel>
          <Panel title="Báo Cáo Tồn Kho Chi Tiết">
            <MuaHangPivot
              rowHeaders={["Tên Hàng"]}
              colGroups={data.branches.map((b) => ({ key: b, label: b }))}
              measures={STOCK_MEASURES}
              rows={data.detail.rows.map((r) => ({
                key: r.name,
                labels: [r.name],
                cells: r.cells,
                total: r.total,
              }))}
              total={data.detail.total}
            />
            <UpdatedAt at={data.updatedAt} count={data.detail.rows.length} />
          </Panel>
          <Panel
            title="Báo Cáo Tồn Kho Chi Tiết — Khuyến Mãi / Cận Date"
            subtitle="Trang “Tồn kho” thứ 2 của Power BI: chỉ hiện hàng có số khác 0.">
            <MuaHangPivot
              rowHeaders={["Tên Hàng"]}
              colGroups={data.branches.map((b) => ({ key: b, label: b }))}
              measures={PROMO_MEASURES}
              rows={data.promo.rows.map((r) => ({
                key: r.name,
                labels: [r.name],
                cells: r.cells,
                total: r.total,
              }))}
              total={data.promo.total}
              maxHeight={420}
            />
          </Panel>
        </>
      )}
    </>
  );
}
