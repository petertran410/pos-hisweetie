"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
import { useProductChart } from "@/lib/hooks/useReports";
import {
  ProductReportFilters,
  ProductChartRow,
  ProductViewType,
} from "@/lib/api/reports";
import {
  money,
  moneyAxis,
  vi,
  CATEGORY_PALETTE,
  DT_COLORS,
} from "@/lib/dashboard/format";

interface Props {
  filters: ProductReportFilters;
  viewType: ProductViewType;
}

const VIEW_TITLE: Record<ProductViewType, string> = {
  ProductBySale: "Doanh thu theo sản phẩm",
  ProductByProfit: "Lợi nhuận theo sản phẩm",
  ProductByCategory: "Doanh thu theo nhóm hàng",
  InOutStock: "Nhập - Xuất - Tồn",
  InOutStockDetail: "Chi tiết thẻ kho",
  ProductByUser: "Sản phẩm theo nhân viên",
  ProductByCustomer: "Sản phẩm theo khách hàng",
  ProductBySupplier: "Sản phẩm theo nhà cung cấp",
  DamageItem: "Hàng hỏng / hủy",
};

export function ProductChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useProductChart(filters);
  const rows = useMemo(() => data || [], [data]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.value || 0), 0),
    [rows]
  );

  const isInOut = viewType === "InOutStock" || viewType === "InOutStockDetail";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[viewType]}
        </h2>
      </div>

      {!isLoading && !isError && rows.length > 0 && !isInOut && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">
              {viewType === "DamageItem"
                ? "Tổng giá trị hỏng/hủy:"
                : "Tổng doanh thu:"}
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
            <ProductChart rows={rows} viewType={viewType} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProductChart({
  rows,
  viewType,
}: {
  rows: ProductChartRow[];
  viewType: ProductViewType;
}) {
  const tooltipFmt = (v: number | string) => money(Number(v));
  const top = rows.slice(0, 20);

  if (viewType === "ProductByCategory") {
    const pieData = top.map((r) => ({ name: r.subject, value: r.value }));
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

  if (viewType === "InOutStock" || viewType === "InOutStockDetail") {
    // revenue=tồn đầu, totalCost=nhập, profit=xuất
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => vi(Number(v))} />
          <YAxis
            type="category"
            dataKey="subject"
            width={160}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v: number | string) => vi(Number(v))} />
          <Legend />
          <Bar dataKey="totalCost" name="Nhập" fill={DT_COLORS.primary} />
          <Bar dataKey="profit" name="Xuất" fill={DT_COLORS.gold} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // bar ngang theo doanh thu/giá trị
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
        <Tooltip formatter={tooltipFmt} />
        <Bar
          dataKey="value"
          name={viewType === "DamageItem" ? "Giá trị" : "Doanh thu"}
          fill={DT_COLORS.primary}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
