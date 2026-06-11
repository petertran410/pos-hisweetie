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
import { useSaleChart } from "@/lib/hooks/useReports";
import {
  SaleReportFilters,
  SaleChartRow,
  SaleViewType,
} from "@/lib/api/reports";
import { money, moneyAxis, vi, BRANCH_PALETTE, DT_COLORS } from "@/lib/dashboard/format";

interface Props {
  filters: SaleReportFilters;
  viewType: SaleViewType;
}

const VIEW_TITLE: Record<SaleViewType, string> = {
  PurchaseDate: "Doanh thu theo thời gian",
  Profit: "Lợi nhuận theo thời gian",
  SoldBy: "Doanh thu theo nhân viên bán",
  Branch: "Doanh thu theo chi nhánh",
  Refund: "Giá trị trả hàng theo thời gian",
};

// Gom các dòng PurchaseDate (stacked theo chi nhánh) → rows recharts
function toStackedRows(rows: SaleChartRow[]) {
  const branchSet = new Set<string>();
  const map = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    const group = r.group || "Chưa rõ";
    branchSet.add(group);
    const cur = map.get(r.subject) || { subject: r.subject };
    cur[group] = ((cur[group] as number) || 0) + r.value;
    map.set(r.subject, cur);
  }
  return { data: Array.from(map.values()), branches: Array.from(branchSet) };
}

export function SaleChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useSaleChart(filters);

  const rows = useMemo(() => data || [], [data]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.value || 0), 0),
    [rows]
  );
  const profitTotals = useMemo(() => {
    if (viewType !== "Profit") return null;
    return rows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue || 0;
        acc.cost += r.totalCost || 0;
        acc.profit += r.profit || 0;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [rows, viewType]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[viewType]}
        </h2>
      </div>

      {/* KPI tổng */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {viewType === "Profit" && profitTotals ? (
            <>
              <div>
                <span className="text-gray-500">Doanh thu:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {vi(profitTotals.revenue)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Giá vốn:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {vi(profitTotals.cost)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lợi nhuận:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {vi(profitTotals.profit)}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-gray-500">
                {viewType === "Refund" ? "Tổng trả hàng:" : "Tổng doanh thu:"}
              </span>{" "}
              <span className="font-semibold text-brand-dark">{vi(total)}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
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
          <div className="h-[420px]">
            <SaleChart rows={rows} viewType={viewType} />
          </div>
        )}
      </div>
    </div>
  );
}

function SaleChart({
  rows,
  viewType,
}: {
  rows: SaleChartRow[];
  viewType: SaleViewType;
}) {
  const tooltipFmt = (v: number | string) => money(Number(v));

  if (viewType === "Branch") {
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
            outerRadius={140}
            label={(e: { name?: string; percent?: number }) =>
              `${e.name}: ${((e.percent ?? 0) * 100).toFixed(1)}%`
            }>
            {pieData.map((_, i) => (
              <Cell
                key={i}
                fill={BRANCH_PALETTE[i % BRANCH_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFmt} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (viewType === "SoldBy") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={moneyAxis} />
          <YAxis
            type="category"
            dataKey="subject"
            width={140}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={tooltipFmt} />
          <Bar dataKey="value" name="Doanh thu" fill={DT_COLORS.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (viewType === "Profit") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={moneyAxis} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke={DT_COLORS.primary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="totalCost"
            name="Giá vốn"
            stroke={DT_COLORS.gold}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Lợi nhuận"
            stroke={DT_COLORS.primaryDark}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (viewType === "Refund") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={moneyAxis} />
          <Tooltip formatter={tooltipFmt} />
          <Bar dataKey="value" name="Trả hàng" fill={DT_COLORS.error} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // PurchaseDate — stacked theo chi nhánh
  const { data, branches } = toStackedRows(rows);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={moneyAxis} />
        <Tooltip formatter={tooltipFmt} />
        {branches.length > 1 && <Legend />}
        {branches.map((b, i) => (
          <Bar
            key={b}
            dataKey={b}
            name={b}
            stackId="rev"
            fill={BRANCH_PALETTE[i % BRANCH_PALETTE.length]}
            radius={i === branches.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
