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
} from "recharts";
import { Loader2 } from "lucide-react";
import { useCustomerChart } from "@/lib/hooks/useReports";
import {
  CustomerReportFilters,
  CustomerChartRow,
  CustomerViewType,
} from "@/lib/api/reports";
import { money, moneyAxis, vi, DT_COLORS } from "@/lib/dashboard/format";

interface Props {
  filters: CustomerReportFilters;
  viewType: CustomerViewType;
}

const TOP_N = 20;

const VIEW_TITLE: Record<CustomerViewType, string> = {
  CustomerBySale: "Top 20 khách hàng mua nhiều nhất (đã trừ trả hàng)",
  CustomerByProfit: "Top 20 khách hàng lợi nhuận cao nhất (đã trừ trả hàng)",
  CustomerDebt: "Top 20 khách hàng nợ nhiều nhất",
  CustomerByProduct: "Top 20 khách hàng theo hàng bán",
};

const KPI_LABEL: Record<CustomerViewType, string> = {
  CustomerBySale: "Tổng doanh thu",
  CustomerByProfit: "Tổng lợi nhuận",
  CustomerDebt: "Tổng nợ cuối kỳ",
  CustomerByProduct: "Tổng doanh thu",
};

export function CustomerChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useCustomerChart(filters);
  const rows = useMemo(() => data || [], [data]);

  const kpiValue = useMemo(
    () => rows.reduce((s, r) => s + (r.value || 0), 0),
    [rows],
  );

  const top = useMemo(() => rows.slice(0, TOP_N), [rows]);

  const chartHeight = useMemo(
    () => Math.max(420, top.length * 24 + 80),
    [top.length],
  );

  const title = VIEW_TITLE[viewType];
  const kpiLabel = KPI_LABEL[viewType];
  const isDebt = viewType === "CustomerDebt";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* ── Header: tiêu đề + context ── */}
      <div className="border-b px-5 py-3 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {isDebt
            ? "Tất cả chi nhánh · Nợ cuối kỳ"
            : "Tất cả chi nhánh · Đã trừ trả hàng"}
        </p>
      </div>

      {/* ── KPI strip ── */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-5 py-3 border-b bg-white flex flex-wrap gap-x-10 gap-y-2 shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
              {kpiLabel}
            </p>
            <p className="text-xl font-bold text-brand-dark mt-0.5">
              {vi(kpiValue)}
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

      {/* ── Chart area ── */}
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
          <div style={{ height: chartHeight }}>
            <CustomerBarChart rows={top} viewType={viewType} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { subject: string };
  }>;
}
function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const name = item.payload.subject;
  const value = item.value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 max-w-xs">
      <p className="text-xs text-gray-700 leading-snug">{name}</p>
      <p className="text-sm font-bold text-brand-dark mt-1">
        {money(value)}
        <span className="text-xs font-semibold text-gray-500 ml-1">đ</span>
      </p>
    </div>
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

function CustomerBarChart({
  rows,
  viewType,
}: {
  rows: CustomerChartRow[];
  viewType: CustomerViewType;
}) {
  const isDebt = viewType === "CustomerDebt";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="#e5e7eb"
        />
        <XAxis
          type="number"
          tickFormatter={moneyAxis}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          stroke="#e5e7eb"
        />
        <YAxis
          type="category"
          dataKey="subject"
          width={220}
          tick={<TruncatedTick />}
          interval={0}
          stroke="#e5e7eb"
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar
          dataKey="value"
          name={
            viewType === "CustomerByProfit"
              ? "Lợi nhuận"
              : isDebt
                ? "Nợ cuối kỳ"
                : "Doanh thu"
          }
          fill={isDebt ? DT_COLORS.gold : DT_COLORS.primary}
          radius={[0, 6, 6, 0]}
          maxBarSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
