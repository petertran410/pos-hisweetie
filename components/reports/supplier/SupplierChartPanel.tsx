"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useSupplierChart } from "@/lib/hooks/useReports";
import {
  SupplierReportFilters,
  SupplierChartRow,
  SupplierViewType,
} from "@/lib/api/reports";
import { money, moneyAxis, vi, DT_COLORS } from "@/lib/dashboard/format";

interface Props {
  filters: SupplierReportFilters;
  viewType: SupplierViewType;
}

const VIEW_TITLE: Record<SupplierViewType, string> = {
  PurchaseBySupplier: "Giá trị nhập theo nhà cung cấp",
  PurchaseByProduct: "Giá trị nhập theo sản phẩm",
  SupplierDebt: "Công nợ nhà cung cấp",
  SupplierReturn: "Trả hàng nhập theo NCC",
  SupplierInfo: "Tổng hợp nhà cung cấp",
};

export function SupplierChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useSupplierChart(filters);
  const rows = useMemo(() => data || [], [data]);
  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.value || 0), 0),
    [rows]
  );

  const isDebt = viewType === "SupplierDebt" || viewType === "SupplierInfo";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-5 py-3 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          {VIEW_TITLE[viewType]}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Tất cả chi nhánh · Top 20
        </p>
      </div>

      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-5 py-3 border-b bg-white flex flex-wrap gap-x-10 gap-y-2 shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
              {viewType === "SupplierReturn"
                ? "Tổng trả hàng"
                : "Tổng giá trị nhập"}
            </p>
            <p className="text-xl font-bold text-brand-dark mt-0.5">
              {vi(total)}
              <span className="text-sm font-semibold text-gray-600 ml-1">đ</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
              Số dòng
            </p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">
              {rows.length}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-40">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full min-h-40 gap-2 text-sm text-gray-500">
            <span>Không tải được dữ liệu báo cáo</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-40 text-gray-400 text-sm">
            Không có dữ liệu
          </div>
        ) : (
          <div className="h-[460px]">
            <SupplierChart rows={rows} isDebt={isDebt} />
          </div>
        )}
      </div>
    </div>
  );
}

function SupplierChart({
  rows,
  isDebt,
}: {
  rows: SupplierChartRow[];
  isDebt: boolean;
}) {
  const top = rows.slice(0, 20);
  const gridStroke = "#e5e7eb";
  const axisTick = { fontSize: 11, fill: "#6b7280" };
  if (isDebt) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke={gridStroke}
          />
          <XAxis type="number" tickFormatter={moneyAxis} tick={axisTick} />
          <YAxis
            type="category"
            dataKey="subject"
            width={220}
            tick={<TruncatedTick />}
            interval={0}
            stroke={gridStroke}
          />
          <Tooltip
            formatter={(v: number | string) => money(Number(v))}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Legend />
          <Bar
            dataKey="debit"
            name="Tổng nhập"
            fill={DT_COLORS.primary}
            maxBarSize={8}
          />
          <Bar
            dataKey="credit"
            name="Đã trả"
            fill={DT_COLORS.gold}
            maxBarSize={8}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={top}
        layout="vertical"
        margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke={gridStroke}
        />
        <XAxis type="number" tickFormatter={moneyAxis} tick={axisTick} />
        <YAxis
          type="category"
          dataKey="subject"
          width={220}
          tick={<TruncatedTick />}
          interval={0}
          stroke={gridStroke}
        />
        <Tooltip
          formatter={(v: number | string) => money(Number(v))}
          cursor={{ fill: "#f3f4f6" }}
        />
        <Bar
          dataKey="value"
          name="Giá trị"
          fill={DT_COLORS.primary}
          radius={[0, 6, 6, 0]}
          maxBarSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Custom YAxis tick: 1 dòng cắt "…" ──
interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}
function TruncatedTick({ x = 0, y = 0, payload }: TickProps) {
  const text = String(payload?.value ?? "");
  const maxChars = 32;
  const truncated =
    text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
  return (
    <text x={x - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#374151">
      {truncated}
    </text>
  );
}
