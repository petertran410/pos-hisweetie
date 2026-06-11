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
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[viewType]}
        </h2>
      </div>

      {!isLoading && !isError && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">
              {viewType === "SupplierReturn"
                ? "Tổng trả hàng:"
                : "Tổng giá trị nhập:"}
            </span>{" "}
            <span className="font-semibold text-brand-dark">{vi(total)}</span>
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
  if (isDebt) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={moneyAxis} />
          <YAxis
            type="category"
            dataKey="subject"
            width={160}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v: number | string) => money(Number(v))} />
          <Legend />
          <Bar dataKey="debit" name="Tổng nhập" fill={DT_COLORS.primary} />
          <Bar dataKey="credit" name="Đã trả" fill={DT_COLORS.gold} />
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
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={moneyAxis} />
        <YAxis
          type="category"
          dataKey="subject"
          width={160}
          tick={{ fontSize: 11 }}
        />
        <Tooltip formatter={(v: number | string) => money(Number(v))} />
        <Bar
          dataKey="value"
          name="Giá trị"
          fill={DT_COLORS.primary}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
