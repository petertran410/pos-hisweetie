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

// Số dòng tối đa của chart (Top N).
const TOP_N = 20;

// Tiêu đề chart theo KiotViet: "Top 20 sản phẩm doanh thu cao nhất (đã trừ trả hàng)".
const VIEW_TITLE: Record<ProductViewType, string> = {
  ProductBySale: "Top 20 sản phẩm doanh thu cao nhất (đã trừ trả hàng)",
  ProductByProfit: "Top 20 sản phẩm lợi nhuận cao nhất (đã trừ trả hàng)",
  ProductByCategory: "Doanh thu theo nhóm hàng",
  InOutStock: "Top 20 sản phẩm nhập - xuất - tồn",
  InOutStockDetail: "Chi tiết thẻ kho",
  ProductByUser: "Top 20 sản phẩm theo nhân viên",
  ProductByCustomer: "Top 20 sản phẩm theo khách hàng",
  ProductBySupplier: "Top 20 sản phẩm theo nhà cung cấp",
  DamageItem: "Top 20 hàng hóa hỏng / hủy",
};

// Tiêu đề KPI chính.
const KPI_LABEL: Record<ProductViewType, string> = {
  ProductBySale: "Tổng doanh thu",
  ProductByProfit: "Tổng lợi nhuận",
  ProductByCategory: "Tổng doanh thu",
  InOutStock: "Tổng tồn cuối kỳ",
  InOutStockDetail: "Tổng tồn cuối kỳ",
  ProductByUser: "Tổng doanh thu",
  ProductByCustomer: "Tổng doanh thu",
  ProductBySupplier: "Tổng doanh thu",
  DamageItem: "Tổng giá trị hỏng/hủy",
};

export function ProductChartPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useProductChart(filters);
  const rows = useMemo(() => data || [], [data]);

  // Tính tổng theo đúng nghĩa KPI.
  const kpiValue = useMemo(() => {
    if (rows.length === 0) return 0;
    if (viewType === "DamageItem") {
      return rows.reduce((s, r) => s + (r.value || 0), 0);
    }
    if (viewType === "InOutStock" || viewType === "InOutStockDetail") {
      return rows.reduce((s, r) => s + (r.value || 0), 0);
    }
    return rows.reduce((s, r) => s + (r.value || 0), 0);
  }, [rows, viewType]);

  const top = useMemo(() => rows.slice(0, TOP_N), [rows]);

  // Chiều cao chart: ~24px / bar + padding. Top 20 ≈ 560px; scroll nội bộ khi màn hình thấp.
  const chartHeight = useMemo(
    () => Math.max(420, top.length * 24 + 80),
    [top.length]
  );

  const title = VIEW_TITLE[viewType];
  const kpiLabel = KPI_LABEL[viewType];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* ── Header: tiêu đề + context ── */}
      <div className="border-b px-5 py-3 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Tháng này · Tất cả chi nhánh · Đã trừ trả hàng
        </p>
      </div>

      {/* ── KPI strip: Tổng + Số dòng ── */}
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

      {/* ── Chart area: scroll nội bộ khi màn hình thấp ── */}
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
            <ProductChart rows={top} viewType={viewType} />
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

// ── Custom YAxis tick: 1 dòng cắt "…" (tooltip giữ tên đầy đủ) ──
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
    <text
      x={x - 8}
      y={y + 4}
      textAnchor="end"
      fontSize={11}
      fill="#374151">
      {truncated}
    </text>
  );
}

// ── Chart container ─────────────────────────────────────────
function ProductChart({
  rows,
  viewType,
}: {
  rows: ProductChartRow[];
  viewType: ProductViewType;
}) {
  if (viewType === "ProductByCategory") {
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
              <Cell
                key={i}
                fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
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
          <Legend />
          <Bar
            dataKey="totalCost"
            name="Nhập"
            fill={DT_COLORS.primary}
            radius={[0, 6, 6, 0]}
            maxBarSize={8}
          />
          <Bar
            dataKey="profit"
            name="Xuất"
            fill={DT_COLORS.gold}
            radius={[0, 6, 6, 0]}
            maxBarSize={8}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // bar ngang theo doanh thu/lợi nhuận/giá trị
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
            viewType === "DamageItem"
              ? "Giá trị"
              : viewType === "ProductByProfit"
                ? "Lợi nhuận"
                : "Doanh thu"
          }
          fill={DT_COLORS.primary}
          radius={[0, 6, 6, 0]}
          maxBarSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}