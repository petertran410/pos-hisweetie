"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import {
  PriceHistorySeriesPoint,
  PriceHistorySeriesResponse,
} from "@/lib/api/factory-products";
import { BRANCH_PALETTE, moneyAxis, vi } from "@/lib/dashboard/format";

interface Props {
  data?: PriceHistorySeriesResponse;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const EVENT_LABEL: Record<string, string> = {
  reference: "Giá tham chiếu",
  purchase_order: "Giá PĐN",
};

/**
 * Mỗi nhà máy là 1 series riêng; giá giữ nguyên tới lần đổi kế tiếp nên dùng
 * `stepAfter` thay vì nội suy tuyến tính — nội suy sẽ vẽ ra mức giá chưa từng
 * tồn tại giữa 2 mốc.
 */
function buildChartRows(points: PriceHistorySeriesPoint[]) {
  const byTime = new Map<number, Record<string, number | string | null>>();
  const lastValue = new Map<string, number>();
  const sorted = [...points].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const point of sorted) {
    const time = new Date(point.createdAt).getTime();
    const key = point.factory?.name || `NM #${point.factoryProductId}`;
    if (point.value != null) lastValue.set(key, point.value);
    const row = byTime.get(time) ?? {
      time,
      label: new Date(point.createdAt).toLocaleDateString("vi-VN"),
    };
    for (const [seriesKey, value] of lastValue) row[seriesKey] = value;
    byTime.set(time, row);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row);
}

export function FactoryPriceTrendChart({
  data,
  isLoading,
  isError,
  onRetry,
}: Props) {
  const points = useMemo(() => data?.points ?? [], [data]);
  const rows = useMemo(() => buildChartRows(points), [points]);
  const seriesKeys = useMemo(
    () => [
      ...new Set(
        points.map(
          (point) => point.factory?.name || `NM #${point.factoryProductId}`
        )
      ),
    ],
    [points]
  );
  const summary = data?.summary;
  const isVnd = (data?.currencyMode ?? "vnd") === "vnd";
  const unit = isVnd ? "đ" : points[0]?.currency ?? "";
  const changePositive = (summary?.change ?? 0) >= 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-5 py-3 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          Biến động giá theo thời gian
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Giá giữ nguyên cho tới lần thay đổi kế tiếp
        </p>
      </div>

      {!isLoading && !isError && points.length > 0 && summary && (
        <div className="px-5 py-3 border-b flex flex-wrap gap-x-10 gap-y-2 shrink-0">
          <Kpi label="Giá mới nhất" value={summary.latest} unit={unit} />
          <Kpi label="Thấp nhất" value={summary.min} unit={unit} />
          <Kpi label="Cao nhất" value={summary.max} unit={unit} />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
              Thay đổi
            </p>
            <p
              className={`text-xl font-bold mt-0.5 flex items-center gap-1 ${changePositive ? "text-red-600" : "text-green-700"}`}>
              {changePositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {summary.changePercent == null
                ? "—"
                : `${summary.changePercent > 0 ? "+" : ""}${summary.changePercent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}
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
            <span>Không tải được dữ liệu biến động giá</span>
            <button
              onClick={onRetry}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : points.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-40 text-gray-400 text-sm">
            Chưa có dữ liệu biến động giá trong khoảng thời gian này
          </div>
        ) : (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rows}
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  tickFormatter={isVnd ? moneyAxis : (value) => vi(Number(value))}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number | string) =>
                    `${vi(Number(value))} ${unit}`
                  }
                />
                <Legend />
                {seriesKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="stepAfter"
                    dataKey={key}
                    name={key}
                    stroke={BRANCH_PALETTE[index % BRANCH_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {points.length > 0 && (
        <div className="border-t max-h-64 overflow-auto shrink-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Thời điểm</th>
                <th className="px-4 py-2 text-left font-medium">Nhà máy</th>
                <th className="px-4 py-2 text-left font-medium">Loại</th>
                <th className="px-4 py-2 text-right font-medium">Giá</th>
                <th className="px-4 py-2 text-right font-medium">Tỉ giá</th>
                <th className="px-4 py-2 text-left font-medium">Chứng từ</th>
                <th className="px-4 py-2 text-left font-medium">Người ghi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...points].reverse().map((point) => (
                <tr key={point.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                    {new Date(point.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2">{point.factory?.name || "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${point.eventType === "purchase_order" ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand-dark"}`}>
                      {EVENT_LABEL[point.eventType] ?? point.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {point.value == null
                      ? "—"
                      : `${vi(point.value)} ${isVnd ? "đ" : point.currency}`}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {point.exchangeRate == null
                      ? "—"
                      : point.exchangeRate.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {point.refCode || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {point.changedByName || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
        {label}
      </p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">
        {value == null ? "—" : vi(value)}
        {value != null && (
          <span className="text-sm font-semibold text-gray-600 ml-1">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
