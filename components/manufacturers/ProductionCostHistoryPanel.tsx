"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ChartNoAxesCombined,
  Table2,
  RefreshCw,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  productionsApi,
  type ProductionCostHistoryRow,
} from "@/lib/api/productions";
import { usePermission } from "@/lib/hooks/usePermissions";
import { BatchCostApplyModal } from "@/components/productions/BatchCostApplyModal";
import { ProductPicker } from "./ProductionPickers";

const money = (value: number | null) =>
  value == null
    ? "-"
    : value.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
const day = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const field =
  "w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-2 text-sm";
const iconButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border text-gray-600 hover:bg-gray-50 disabled:opacity-40";
const td = "whitespace-nowrap px-3 py-2.5 align-top";

function CostTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProductionCostHistoryRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="max-w-[270px] rounded border bg-white p-3 text-xs shadow-md">
      <p className="font-semibold">
        {row.code} · {day(row.completedDate)}
      </p>
      <p className="mt-1 break-words">{row.manufacturerName}</p>
      <dl className="mt-2 space-y-1">
        <div>Hàng mình: {money(row.materialValue)} đ</div>
        <div>NSX bổ sung: {money(row.manufacturerMaterialCost)} đ</div>
        <div>Gia công: {money(row.processingFee)} đ</div>
        <div>Tổng: {money(row.totalCost)} đ</div>
        <div className="font-semibold">Đơn vị: {money(row.unitCost)} đ</div>
      </dl>
    </div>
  );
}

export function ProductionCostHistoryPanel({
  manufacturerId,
}: {
  manufacturerId?: number | null;
}) {
  const canView = usePermission("productions", "view");
  const canApply = usePermission("productions", "apply_cost");
  const [productId, setProductId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return localDate(date);
  });
  const [toDate, setToDate] = useState(() => localDate(new Date()));
  const [variantKey, setVariantKey] = useState("");
  const [mode, setMode] = useState<"table" | "chart">("table");
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const [applying, setApplying] = useState<number | null>(null);
  const filterKey = JSON.stringify([
    productId,
    manufacturerId,
    fromDate,
    toDate,
    variantKey,
  ]);
  const page = pagination.key === filterKey ? pagination.page : 1;
  const params = {
    productId: productId!,
    manufacturerId: manufacturerId ?? undefined,
    fromDate: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
    toDate: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
    variantKey: variantKey || undefined,
    page,
    pageSize: 20,
  };
  const history = useQuery({
    queryKey: ["production-cost-history", mode, params],
    queryFn: () => productionsApi.costHistory(params, mode === "chart"),
    enabled:
      canView && !!productId && (!fromDate || !toDate || fromDate <= toDate),
  });
  const groups = new Map<
    string,
    { label: string; rows: ProductionCostHistoryRow[] }
  >();
  for (const row of history.data?.data ?? []) {
    // No line joins batches with unknown or incompatible specifications.
    const key = row.snapshotMissing ? `missing-${row.id}` : row.variantKey;
    if (!groups.has(key))
      groups.set(key, { label: row.variantLabel, rows: [] });
    groups.get(key)!.rows.push(row);
  }

  if (!canView)
    return (
      <p className="p-4 text-sm text-red-700">
        Bạn không có quyền xem lịch sử giá thành.
      </p>
    );
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold text-gray-800">
          Lịch sử giá thành
        </h2>
        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded border p-0.5"
            aria-label="Chế độ lịch sử"
          >
            <button
              title="Bảng"
              aria-label="Bảng"
              aria-pressed={mode === "table"}
              onClick={() => setMode("table")}
              className={`flex h-8 w-9 items-center justify-center rounded ${mode === "table" ? "bg-brand text-white" : "text-gray-500"}`}
            >
              <Table2 size={17} />
            </button>
            <button
              title="Biểu đồ"
              aria-label="Biểu đồ"
              aria-pressed={mode === "chart"}
              onClick={() => setMode("chart")}
              className={`flex h-8 w-9 items-center justify-center rounded ${mode === "chart" ? "bg-brand text-white" : "text-gray-500"}`}
            >
              <ChartNoAxesCombined size={17} />
            </button>
          </div>
          <button
            title="Làm mới lịch sử"
            aria-label="Làm mới lịch sử"
            disabled={!productId || history.isFetching}
            className={iconButton}
            onClick={() => {
              void history.refetch();
            }}
          >
            <RefreshCw
              size={15}
              className={history.isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </header>
      <div className="grid shrink-0 gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Sản phẩm *
          </label>
          <ProductPicker
            value={productId}
            label="Sản phẩm lịch sử giá thành"
            onChange={(product) => {
              setProductId(product.id);
              setVariantKey("");
            }}
          />
        </div>
        <label className="min-w-0 text-xs font-medium text-gray-500">
          Từ ngày
          <input
            aria-label="Từ ngày hoàn thành"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
            className={`${field} mt-1 font-normal text-gray-800`}
          />
        </label>
        <label className="min-w-0 text-xs font-medium text-gray-500">
          Đến ngày
          <input
            aria-label="Đến ngày hoàn thành"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            className={`${field} mt-1 font-normal text-gray-800`}
          />
        </label>
        <label className="min-w-0 text-xs font-medium text-gray-500">
          Đơn vị / quy cách
          <select
            aria-label="Đơn vị / quy cách"
            value={variantKey}
            onChange={(event) => setVariantKey(event.target.value)}
            className={`${field} mt-1 font-normal text-gray-800`}
          >
            <option value="">Tất cả quy cách</option>
            {history.data?.variants.map((variant) => (
              <option key={variant.key} value={variant.key}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!productId ? (
        <p className="p-8 text-center text-sm text-gray-500">
          Chọn sản phẩm để xem lịch sử giá thành.
        </p>
      ) : fromDate && toDate && fromDate > toDate ? (
        <p role="alert" className="p-4 text-sm text-red-700">
          Khoảng ngày không hợp lệ.
        </p>
      ) : history.isLoading ? (
        <p className="p-8 text-center text-sm text-gray-500">
          Đang tải lịch sử giá thành...
        </p>
      ) : history.isError ? (
        <div role="alert" className="p-4 text-sm text-red-700">
          {history.error.message}
        </div>
      ) : !history.data?.total ? (
        <p className="p-8 text-center text-sm text-gray-500">
          Không có đợt gia công trong bộ lọc này.
        </p>
      ) : mode === "table" ? (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1780px] text-right text-sm">
              <thead className="sticky top-0 z-10 border-b bg-gray-100 text-xs text-gray-600">
                <tr>
                  {[
                    "Phiếu / Ngày hoàn thành",
                    "Nhà sản xuất",
                    "Công thức / mẫu",
                    "Lượng nhận / Quy cách",
                    "Hàng mình (đ)",
                    "NSX bổ sung (đ)",
                    "Gia công (đ)",
                    "Tổng giá thành (đ)",
                    "Giá thành dự kiến (đ)",
                    "Giá thành thực tế (đ)",
                    "Chênh lệch (đ / %)",
                    "Áp giá vốn",
                  ].map((label, index) => (
                    <th
                      key={label}
                      className={`whitespace-nowrap px-3 py-3 font-medium ${index < 4 || index === 11 ? "text-left" : ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.data.data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className={`${td} text-left`}>
                      <span className="font-medium text-brand">{row.code}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {day(row.completedDate)}
                      </span>
                    </td>
                    <td
                      className={`${td} max-w-52 whitespace-normal break-words text-left`}
                    >
                      {row.manufacturerName}
                    </td>
                    <td
                      className={`${td} max-w-48 whitespace-normal break-words text-left`}
                    >
                      {row.formulaName || row.externalTemplateName || "-"}
                    </td>
                    <td className={`${td} text-left`}>
                      {money(row.receivedQuantity)}
                      <span
                        className={`mt-1 block text-xs ${row.snapshotMissing ? "text-amber-700" : "text-gray-500"}`}
                      >
                        {row.variantLabel}
                      </span>
                    </td>
                    <td className={td}>{money(row.materialValue)}</td>
                    <td className={td}>
                      {money(row.manufacturerMaterialCost)}
                    </td>
                    <td className={td}>{money(row.processingFee)}</td>
                    <td className={td}>{money(row.totalCost)}</td>
                    <td className={`${td} font-semibold`}>
                      {money(row.unitCost)}
                      {row.snapshotMissing && (
                        <span className="mt-1 block text-xs font-normal text-amber-700">
                          Thiếu snapshot
                        </span>
                      )}
                    </td>
                    {/* Toàn bộ chi phí / tổng đã nhận: lệch dự kiến khi NSX trả thiếu hoặc đổi tiền theo đợt. */}
                    <td
                      className={`${td} ${row.actualUnitCost != null && row.unitCost != null && row.actualUnitCost - row.unitCost > 0.005 ? "text-red-700" : "text-gray-700"}`}
                    >
                      {row.actualUnitCost == null ? "-" : money(row.actualUnitCost)}
                    </td>
                    <td
                      className={`${td} ${row.deltaAmount != null && row.deltaAmount > 0 ? "text-red-700" : row.deltaAmount != null && row.deltaAmount < 0 ? "text-green-700" : "text-gray-500"}`}
                    >
                      {row.deltaAmount == null
                        ? "-"
                        : `${row.deltaAmount > 0 ? "+" : ""}${money(row.deltaAmount)}`}
                      <span className="mt-1 block text-xs">
                        {row.deltaPercent == null
                          ? "-"
                          : `${row.deltaPercent > 0 ? "+" : ""}${row.deltaPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}
                      </span>
                    </td>
                    <td className={`${td} text-left`}>
                      {row.costAppliedAt ? (
                        <div>
                          <span className="text-green-700">
                            Đã áp · {day(row.costAppliedAt)}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {row.costAppliedByName}
                            {row.costAppliedScope === "allBranches"
                              ? " · Tất cả chi nhánh"
                              : " · Kho nhận"}
                          </span>
                        </div>
                      ) : canApply && row.canApply ? (
                        <button
                          onClick={() => setApplying(row.id)}
                          className="inline-flex items-center gap-1.5 rounded border border-brand px-2 py-1.5 text-xs text-brand hover:bg-brand-soft"
                        >
                          <Check size={14} />
                          Áp dụng giá vốn
                        </button>
                      ) : (
                        <span className="text-gray-500">Chưa áp</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-gray-600">
            <span>
              {history.data.total.toLocaleString("vi-VN")} đợt · Đơn giá VND
            </span>
            <div className="flex items-center gap-2">
              <button
                title="Trang trước"
                aria-label="Trang trước"
                className={iconButton}
                disabled={page <= 1}
                onClick={() =>
                  setPagination({ key: filterKey, page: page - 1 })
                }
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Trang {page} / {Math.max(1, Math.ceil(history.data.total / 20))}
              </span>
              <button
                title="Trang sau"
                aria-label="Trang sau"
                className={iconButton}
                disabled={page * 20 >= history.data.total}
                onClick={() =>
                  setPagination({ key: filterKey, page: page + 1 })
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          {[...groups].map(([key, group]) => (
            <section key={key} className="min-w-0">
              <h3 className="mb-2 text-sm font-medium">{group.label}</h3>
              <div
                className="h-72 w-full min-w-0"
                role="img"
                aria-label={`Biểu đồ giá thành ${group.label}, ${group.rows.length} đợt`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={group.rows}
                    margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="id"
                      tickFormatter={(id) => {
                        const row = group.rows.find((item) => item.id === id);
                        return row
                          ? new Date(row.completedDate).toLocaleDateString(
                              "vi-VN",
                              { day: "numeric", month: "numeric" },
                            )
                          : "";
                      }}
                      tick={{ fontSize: 11 }}
                      minTickGap={35}
                    />
                    <YAxis
                      tickFormatter={(value: number) => money(value)}
                      width={70}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CostTooltip />} />
                    <Line
                      name="Giá thành đơn vị"
                      type="linear"
                      dataKey="unitCost"
                      stroke="#0f766e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          ))}
          <p className="text-xs text-gray-500">
            {history.data.total} đợt · VND / đơn vị nhận
          </p>
        </div>
      )}
      {applying != null && canApply && (
        <BatchCostApplyModal
          productionId={applying}
          onClose={() => setApplying(null)}
        />
      )}
    </div>
  );
}
