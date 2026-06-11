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
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[viewType]}
        </h2>
      </div>

      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {viewType === "SalePerformance" ? (
            <>
              <div>
                <span className="text-gray-500">Doanh thu:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {vi(totals.revenue)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Giá vốn:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {vi(totals.cost)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lợi nhuận:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {vi(totals.revenue - totals.cost)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-gray-500">Tổng thu:</span>{" "}
                <span className="font-semibold text-green-700">
                  {vi(totals.receipt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tổng chi:</span>{" "}
                <span className="font-semibold text-red-600">
                  {vi(totals.payment)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Chênh lệch:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {vi(totals.receipt - totals.payment)}
                </span>
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={moneyAxis} />
          <Tooltip formatter={tooltipFmt} />
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={moneyAxis} />
        <Tooltip formatter={tooltipFmt} />
        <Legend />
        <Bar dataKey="receipt" name="Thu" fill={DT_COLORS.primary} />
        <Bar dataKey="payment" name="Chi" fill={DT_COLORS.error} />
      </BarChart>
    </ResponsiveContainer>
  );
}
