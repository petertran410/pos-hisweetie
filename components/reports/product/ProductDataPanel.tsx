"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useProductPreview, useProductInvoices } from "@/lib/hooks/useReports";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  productReportApi,
  ProductReportFilters,
  ProductViewType,
  ProductChartRow,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: ProductReportFilters;
  viewType: ProductViewType;
}

const VIEW_TITLE: Record<ProductViewType, string> = {
  ProductBySale: "Bán theo sản phẩm",
  ProductByProfit: "Lợi nhuận theo sản phẩm",
  ProductByCategory: "Theo nhóm hàng",
  InOutStock: "Nhập - Xuất - Tồn",
  InOutStockDetail: "Chi tiết thẻ kho",
  ProductByUser: "Sản phẩm theo nhân viên",
  ProductByCustomer: "Sản phẩm theo khách hàng",
  ProductBySupplier: "Sản phẩm theo nhà cung cấp",
  DamageItem: "Hàng hỏng / hủy",
};

// Các view cho phép drilldown SP → dòng hóa đơn
const DRILLABLE: ProductViewType[] = [
  "ProductBySale",
  "ProductByProfit",
  "ProductByUser",
  "ProductByCustomer",
  "ProductBySupplier",
];

export function ProductDataPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useProductPreview(filters);
  const { canExport } = useReportAccess();
  const [drill, setDrill] = useState<{
    title: string;
    code: string;
  } | null>(null);

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;

  const handleExportOverview = async () => {
    try {
      await productReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const handleExportDetail = async () => {
    try {
      await productReportApi.exportDetail(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  if (drill) {
    return (
      <ProductInvoiceDrilldown
        filters={filters}
        title={drill.title}
        code={drill.code}
        onBack={() => setDrill(null)}
      />
    );
  }

  const isInOut = viewType === "InOutStock" || viewType === "InOutStockDetail";
  const isProfit = viewType === "ProductByProfit";
  const drillable = DRILLABLE.includes(viewType);
  const subjectHeader =
    viewType === "ProductByCategory" ? "Nhóm hàng" : "Sản phẩm";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            {VIEW_TITLE[viewType]}
          </h2>
          {summary && (
            <span className="text-sm text-gray-500">
              • {summary.totalRows} dòng
            </span>
          )}
        </div>
        {canExport("hang-hoa") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            onExportDetail={drillable ? handleExportDetail : undefined}
            disabled={rows.length === 0}
          />
        )}
      </div>

      {/* Summary bar */}
      {summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Tổng SL:</span>{" "}
            <span className="font-semibold text-gray-900">
              {summary.totalQuantity.toLocaleString("vi-VN")}
            </span>
          </div>
          {isProfit ? (
            <>
              <div>
                <span className="text-gray-500">Doanh thu:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.totalRevenue)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Giá vốn:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(summary.totalCost)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lợi nhuận:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {formatCurrency(summary.totalRevenue - summary.totalCost)}
                </span>
              </div>
            </>
          ) : !isInOut ? (
            <div>
              <span className="text-gray-500">
                {viewType === "DamageItem" ? "Tổng giá trị:" : "Tổng doanh thu:"}
              </span>{" "}
              <span className="font-semibold text-brand-dark">
                {formatCurrency(summary.totalValue)}
              </span>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-sm text-gray-500">
            <span>Không tải được dữ liệu báo cáo</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Không có dữ liệu
          </div>
        ) : isInOut ? (
          <InOutTable rows={rows} />
        ) : (
          <ProductAggregateTable
            rows={rows}
            isProfit={isProfit}
            subjectHeader={subjectHeader}
            summary={summary}
            showGroup={
              viewType === "ProductByUser" ||
              viewType === "ProductByCustomer" ||
              viewType === "ProductBySupplier"
            }
            onSelectSubject={
              drillable
                ? (row) => {
                    if (!row.extra1 && !row.subject) return;
                    setDrill({
                      title: `Chi tiết bán hàng — ${row.subject}`,
                      code: row.extra1 || "",
                    });
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function ProductAggregateTable({
  rows,
  isProfit,
  subjectHeader,
  showGroup,
  onSelectSubject,
  summary,
}: {
  rows: ProductChartRow[];
  isProfit: boolean;
  subjectHeader: string;
  showGroup: boolean;
  onSelectSubject?: (row: ProductChartRow) => void;
  summary?: {
    totalQuantity: number;
    totalValue: number;
    totalRevenue: number;
    totalCost: number;
  };
}) {
  const colSpanLead = showGroup ? 3 : 2;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            STT
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            {subjectHeader}
          </th>
          {showGroup && (
            <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
              Nhóm
            </th>
          )}
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            SL
          </th>
          {isProfit ? (
            <>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Doanh thu
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Giá vốn
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Lợi nhuận
              </th>
            </>
          ) : (
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              Giá trị
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-800" colSpan={colSpanLead - 1}>
              Tổng
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {(summary.totalQuantity || 0).toLocaleString("vi-VN")}
            </td>
            {isProfit ? (
              <>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatCurrency(summary.totalRevenue || 0)}
                </td>
                <td className="px-3 py-2 text-right text-orange-600">
                  {formatCurrency(summary.totalCost || 0)}
                </td>
                <td className="px-3 py-2 text-right text-brand-dark">
                  {formatCurrency(
                    (summary.totalRevenue || 0) - (summary.totalCost || 0)
                  )}
                </td>
              </>
            ) : (
              <td className="px-3 py-2 text-right text-brand-dark">
                {formatCurrency(summary.totalValue || 0)}
              </td>
            )}
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-2">
              {onSelectSubject ? (
                <button
                  type="button"
                  onClick={() => onSelectSubject(row)}
                  className="text-brand hover:underline font-medium text-left">
                  {row.subject}
                </button>
              ) : (
                <span className="text-gray-900">{row.subject}</span>
              )}
            </td>
            {showGroup && (
              <td className="px-3 py-2 text-gray-600">{row.group || "-"}</td>
            )}
            <td className="px-3 py-2 text-right text-gray-700">
              {(row.quantity || 0).toLocaleString("vi-VN")}
            </td>
            {isProfit ? (
              <>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.revenue || 0)}
                </td>
                <td className="px-3 py-2 text-right text-orange-600">
                  {formatCurrency(row.totalCost || 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-brand-dark">
                  {formatCurrency(row.profit || 0)}
                </td>
              </>
            ) : (
              <td className="px-3 py-2 text-right font-medium">
                {formatCurrency(row.value || 0)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InOutTable({ rows }: { rows: ProductChartRow[] }) {
  // revenue=tồn đầu, totalCost=nhập, profit=xuất, value=tồn cuối
  const totals = rows.reduce(
    (acc, r) => {
      acc.opening += r.revenue || 0;
      acc.in += r.totalCost || 0;
      acc.out += r.profit || 0;
      acc.closing += r.value || 0;
      return acc;
    },
    { opening: 0, in: 0, out: 0, closing: 0 }
  );
  return (
    <table className="w-full text-sm">
      <thead className="bg-sky-100 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
            Sản phẩm
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Tồn đầu
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Nhập
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Xuất
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Tồn cuối
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.length > 0 && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2 text-gray-800">Tổng</td>
            <td className="px-3 py-2 text-right text-gray-700">
              {totals.opening.toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-green-700">
              {totals.in.toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-orange-600">
              {totals.out.toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-brand-dark">
              {totals.closing.toLocaleString("vi-VN")}
            </td>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-900">{row.subject}</td>
            <td className="px-3 py-2 text-right text-gray-700">
              {(row.revenue || 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-green-700">
              {(row.totalCost || 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-orange-600">
              {(row.profit || 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right font-medium text-brand-dark">
              {(row.value || 0).toLocaleString("vi-VN")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Drilldown: dòng hóa đơn của 1 sản phẩm ──
function ProductInvoiceDrilldown({
  filters,
  title,
  code,
  onBack,
}: {
  filters: ProductReportFilters;
  title: string;
  code: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useProductInvoices({
    ...filters,
    productKeyword: code || filters.productKeyword,
    page,
    limit,
  });

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const summary = data?.summary;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-brand hover:bg-gray-50 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {title}
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-sm text-gray-500">
            <span>Không tải được dữ liệu</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Không có dữ liệu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sky-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Mã giao dịch
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Thời gian
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Sản phẩm
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  SL
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Đơn giá
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Giảm giá
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Đơn giá sau giảm giá
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && page === 1 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={4}>
                    SL dòng: {summary.totalInvoices}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {summary.totalQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    <CodeLink entity="invoice" code={row.invoiceCode} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {row.customerName}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.productName}</td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.quantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(row.price)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(row.discount)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatCurrency(row.priceAfterDiscount)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">
            Trang {page}/{totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
              ‹
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
