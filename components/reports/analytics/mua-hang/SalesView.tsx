"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MuaHangSalesFilters,
  MuaHangTrendLevel,
  SalesCell,
  SalesPageData,
} from "@/lib/api/analytics-mua-hang";
import {
  useMuaHangFilterOptions,
  useNguonHang,
  useNhomHang,
} from "@/lib/hooks/useAnalyticsMuaHang";
import { CATEGORY_PALETTE, DT_COLORS } from "@/lib/dashboard/format";
import { DonutChart, Empty, Panel, axisTick } from "../shared/AnalyticsCharts";
import { TOOLTIP_STYLE, metricAxis } from "../analyticsFormat";
import { MuaHangPivot, type PivotMeasure } from "./MuaHangPivot";
import { MuaHangSlicers, type SlicerSet } from "./MuaHangSlicers";
import { BLANK_LABEL, fmtMoney, fmtQty } from "./muaHangFormat";
import { ErrorBox, LoadingBlock, NoteBox, UpdatedAt } from "./MuaHangCommon";

// Thu Mua › Nhóm Hàng / Nguồn Hàng: cùng bố cục (pie + area + pivot theo tháng),
// khác chiều phân nhóm (product_group_lv2 / origin).
const SLICERS: SlicerSet = {
  period: true,
  branches: "all",
  productTypes: true,
  brands: true,
  visualGroups: true,
  groups2026: true,
  categories: true,
};

const LEVELS: { key: MuaHangTrendLevel; label: string }[] = [
  { key: "year", label: "Năm" },
  { key: "month", label: "Tháng" },
  { key: "day", label: "Ngày" },
];

const MEASURES: PivotMeasure<SalesCell>[] = [
  {
    key: "amount",
    label: "Tổng Tiền Hàng",
    get: (c) => c?.amount,
    format: fmtMoney,
  },
  { key: "qty", label: "Số Lượng Bán", get: (c) => c?.qty, format: fmtQty },
];

const trendLabel = (key: string, level: MuaHangTrendLevel) => {
  if (level === "year") return key;
  const [y, m, d] = key.split("-");
  return level === "month" ? `${m}/${y}` : `${d}/${m}`;
};

function TrendChart({ data }: { data: SalesPageData }) {
  const level = data.trendLevel;
  const rows = data.trend.points.map((p) => ({
    ...p,
    label: trendLabel(p.key, level),
  }));
  if (!rows.length) return <Empty />;
  const multi =
    data.trend.series.length > 1 || data.trend.series[0] !== "value";
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => metricAxis(Number(v), "quantity")}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(_, p) => {
              const k =
                (p?.[0]?.payload as { key?: string } | undefined)?.key ?? "";
              return level === "day"
                ? k.split("-").reverse().join("/")
                : trendLabel(k, level);
            }}
            formatter={(v, n) => [
              fmtQty(Number(v)),
              multi ? String(n) : "Số Lượng Bán",
            ]}
          />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {data.trend.series.map((s, i) => {
            const color = multi
              ? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]
              : DT_COLORS.primary;
            return (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                name={s === "value" ? "Số Lượng Bán" : s}
                stroke={color}
                fill={color}
                fillOpacity={0.18}
                strokeWidth={2}
                connectNulls
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SalesView({ by }: { by: "group" | "origin" }) {
  const [filters, setFilters] = useState<MuaHangSalesFilters>(() => ({
    year: new Date().getFullYear(),
    trendLevel: "month",
  }));
  const defaults: MuaHangSalesFilters = {
    year: new Date().getFullYear(),
    trendLevel: filters.trendLevel,
  };
  const { data: options } = useMuaHangFilterOptions();
  const nhom = useNhomHang(filters, by === "group");
  const nguon = useNguonHang(filters, by === "origin");
  const { data, isLoading, isFetching, error } = by === "group" ? nhom : nguon;
  const dimLabel = by === "group" ? "Nhóm Hàng" : "Nguồn Gốc";

  return (
    <>
      <MuaHangSlicers
        show={SLICERS}
        filters={filters}
        onChange={setFilters}
        options={options}
        defaultFilters={defaults}
        right={
          isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : undefined
        }
      />
      <NoteBox>
        Số bán theo ngày hoá đơn (Power BI không nối bảng ngày với hoá đơn nên
        slicer Năm / Tháng và cột tháng ở Power BI không lọc được — ở đây lọc
        đúng theo tháng). Chỉ hàng đang kinh doanh, bỏ hoá đơn của nhân viên
        trong danh sách loại trừ (Cấu hình).
        {by === "origin" &&
          " Trang chỉ gồm nguồn gốc Nội địa và Nhập khẩu chính ngạch."}
      </NoteBox>
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock blocks={2} />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Panel
              title="Tỷ Trọng Theo Loại Hàng"
              subtitle={`Số lượng bán theo ${dimLabel.toLowerCase()}`}>
              <DonutChart
                rows={data.pie.map((r) => ({
                  name: r.key ?? BLANK_LABEL,
                  value: r.qty ?? 0,
                }))}
                metric="quantity"
              />
            </Panel>
            <Panel
              title="Tình Hình Bán Hàng"
              subtitle="Số lượng bán hàng Lermao + Boduo"
              right={
                <div className="dt-seg">
                  {LEVELS.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      data-on={data.trendLevel === l.key}
                      onClick={() =>
                        setFilters((f) => ({ ...f, trendLevel: l.key }))
                      }>
                      {l.label}
                    </button>
                  ))}
                </div>
              }>
              <TrendChart data={data} />
            </Panel>
          </div>
          <Panel title="Báo Cáo Chi Tiết Hàng Hóa Theo Tháng">
            <MuaHangPivot
              rowHeaders={[`${dimLabel} / Tên Hàng`]}
              colGroups={data.periods.map((p) => ({
                key: p.key,
                label: `Tháng ${p.month}/${p.year}`,
              }))}
              measures={MEASURES}
              groups={data.pivot.map((g) => ({
                key: g.key ?? "__blank__",
                label: g.key ?? BLANK_LABEL,
                cells: g.cells,
                total: g.total,
                children: g.items.map((it) => ({
                  key: it.name,
                  labels: [it.name],
                  cells: it.cells,
                  total: it.total,
                })),
              }))}
              total={data.total}
              defaultCollapsed
            />
            <UpdatedAt at={data.updatedAt} />
          </Panel>
        </>
      )}
    </>
  );
}

export const NhomHangView = () => <SalesView by="group" />;
export const NguonHangView = () => <SalesView by="origin" />;
