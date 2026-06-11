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
import {
  useCustomerSalesChart,
  useProductByCustomerChart,
  useCustomerDebtChart,
} from "@/lib/hooks/useReports";
import { ReportFilters } from "@/lib/api/reports";
import { money, moneyAxis, vi, DT_COLORS } from "@/lib/dashboard/format";
import { ReportType } from "@/components/reports/CustomerReportSidebar";

interface Props {
  filters: ReportFilters;
  reportType: ReportType;
}

const VIEW_TITLE: Record<ReportType, string> = {
  "customer-sales": "Doanh thu theo khách hàng",
  "product-by-customer": "Hàng bán theo khách hàng",
  "customer-debt": "Công nợ cuối kỳ theo khách hàng",
};

export function CustomerChartPanel({ filters, reportType }: Props) {
  const salesQ = useCustomerSalesChart(
    reportType === "customer-sales" ? filters : {}
  );
  const productQ = useProductByCustomerChart(
    reportType === "product-by-customer" ? filters : {}
  );
  const debtQ = useCustomerDebtChart(
    reportType === "customer-debt" ? filters : {}
  );

  const active =
    reportType === "customer-sales"
      ? salesQ
      : reportType === "product-by-customer"
        ? productQ
        : debtQ;

  const rows = useMemo(() => active.data || [], [active.data]);
  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.value || 0), 0),
    [rows]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[reportType]}
        </h2>
      </div>

      {!active.isLoading && !active.isError && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">
              {reportType === "customer-debt"
                ? "Tổng nợ cuối kỳ (top 20):"
                : "Tổng (top 20):"}
            </span>{" "}
            <span className="font-semibold text-brand-dark">{vi(total)}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {active.isLoading ? (
          <div className="flex items-center justify-center h-full min-h-40">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : active.isError ? (
          <div className="flex flex-col items-center justify-center h-full min-h-40 gap-2 text-sm text-gray-500">
            <span>Không tải được dữ liệu báo cáo</span>
            <button
              onClick={() => active.refetch()}
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
                  width={180}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number | string) => money(Number(v))} />
                <Bar
                  dataKey="value"
                  name={
                    reportType === "customer-debt" ? "Nợ cuối kỳ" : "Doanh thu"
                  }
                  fill={
                    reportType === "customer-debt"
                      ? DT_COLORS.gold
                      : DT_COLORS.primary
                  }
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
