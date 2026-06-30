"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useFinancialChart } from "@/lib/hooks/useReports";
import {
  FinancialReportFilters,
  FinancialChartRow,
  FinancialViewType,
} from "@/lib/api/reports";
import {
  money,
  moneyAxis,
  vi,
  CATEGORY_PALETTE,
  DT_COLORS,
} from "@/lib/dashboard/format";

interface Props {
  filters: FinancialReportFilters;
  viewType: FinancialViewType;
}

const VIEW_TITLE: Record<FinancialViewType, string> = {
  CashByGroup: "Thu chi theo nhóm",
  CashByTime: "Thu chi theo thời gian",
  CashFlowSummary: "Sổ quỹ",
  SalePerformance: "Hiệu quả kinh doanh",
};

export function FinancialChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useFinancialChart(filters);
  const rows = useMemo(() => data || [], [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.receipt += r.receipt || 0;
          acc.payment += r.payment || 0;
          acc.revenue += r.revenue || 0;
          acc.cost += r.cost || 0;
          return acc;
        },
        { receipt: 0, payment: 0, revenue: 0, cost: 0 }
      ),
    [rows]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-5 py-3 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          {VIEW_TITLE[viewType]}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Tất cả chi nhánh</p>
      </div>

      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-5 py-3 border-b bg-white flex flex-wrap gap-x-10 gap-y-2 shrink-0">
          {viewType === "SalePerformance" ? (
            <>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Doanh thu
                </p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">
                  {vi(totals.revenue)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Giá vốn
                </p>
                <p className="text-xl font-bold text-orange-600 mt-0.5">
                  {vi(totals.cost)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Lợi nhuận
                </p>
                <p className="text-xl font-bold text-brand-dark mt-0.5">
                  {vi(totals.revenue - totals.cost)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Tổng thu
                </p>
                <p className="text-xl font-bold text-green-700 mt-0.5">
                  {vi(totals.receipt)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Tổng chi
                </p>
                <p className="text-xl font-bold text-red-600 mt-0.5">
                  {vi(totals.payment)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  Chênh lệch
                </p>
                <p className="text-xl font-bold text-brand-dark mt-0.5">
                  {vi(totals.receipt - totals.payment)}
                  <span className="text-sm font-semibold text-gray-600 ml-1">
                    đ
                  </span>
                </p>
              </div>
            </>
          )}
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
            <FinancialChart rows={rows} viewType={viewType} />
          </div>
        )}
      </div>
    </div>
  );
}

function FinancialChart({
  rows,
  viewType,
}: {
  rows: FinancialChartRow[];
  viewType: FinancialViewType;
}) {
  const tooltipFmt = (v: number | string) => money(Number(v));
  const gridStroke = "#e5e7eb";
  const axisTick = { fontSize: 11, fill: "#6b7280" };

  if (viewType === "CashByGroup") {
    // Pie theo tổng giá trị mỗi nhóm
    const pieData = rows.map((r) => ({ name: r.subject, value: r.value }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label={(e: { name?: string; percent?: number }) =>
              `${e.name}: ${((e.percent ?? 0) * 100).toFixed(1)}%`
            }>
            {pieData.map((_, i) => (
              <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFmt} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (viewType === "SalePerformance") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="subject" tick={axisTick} />
          <YAxis tickFormatter={moneyAxis} tick={axisTick} />
          <Tooltip formatter={tooltipFmt} cursor={{ fill: "#f3f4f6" }} />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke={DT_COLORS.primary} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cost" name="Giá vốn" stroke={DT_COLORS.gold} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke={DT_COLORS.primaryDark} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // CashByGroup đã xử lý; CashByTime + CashFlowSummary: cột thu/chi
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="subject" tick={axisTick} />
        <YAxis tickFormatter={moneyAxis} tick={axisTick} />
        <Tooltip formatter={tooltipFmt} cursor={{ fill: "#f3f4f6" }} />
        <Legend />
        <Bar dataKey="receipt" name="Thu" fill={DT_COLORS.primary} maxBarSize={28} />
        <Bar dataKey="payment" name="Chi" fill={DT_COLORS.error} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
