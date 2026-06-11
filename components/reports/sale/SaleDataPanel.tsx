"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useSalePreview, useSaleProfitInvoices } from "@/lib/hooks/useReports";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  saleReportApi,
  SaleReportFilters,
  SaleViewType,
  SaleChartRow,
  SaleRefundRow,
  SaleByDateRow,
  SalePreviewSummary,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: SaleReportFilters;
  viewType: SaleViewType;
}

// Drilldown: tiêu đề + filter ghi đè (ngày / NV / chi nhánh)
interface DrillState {
  title: string;
  override: Partial<SaleReportFilters>;
}

const VIEW_TITLE: Record<SaleViewType, string> = {
  PurchaseDate: "Bán hàng theo thời gian",
  Profit: "Lợi nhuận theo thời gian",
  SoldBy: "Bán hàng theo nhân viên",
  Branch: "Bán hàng theo chi nhánh",
  Refund: "Trả hàng",
};

// Khoảng trọn ngày (local) từ ISO → { fromDate, toDate }
function fullDayRange(iso: string): { fromDate: string; toDate: string } {
  const d = new Date(iso);
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const to = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
  return { fromDate: from.toISOString(), toDate: to.toISOString() };
}

export function SaleDataPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useSalePreview(filters);
  const { canExport } = useReportAccess();
  // Drilldown: subject được chọn (ngày / NV / chi nhánh) để xem chi tiết HĐ
  const [drill, setDrill] = useState<DrillState | null>(null);

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;

  const handleExportOverview = async () => {
    try {
      await saleReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const handleExportDetail = async () => {
    try {
      await saleReportApi.exportDetail(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const subjectHeader =
    viewType === "SoldBy"
      ? "Nhân viên"
      : viewType === "Branch"
        ? "Chi nhánh"
        : "Thời gian";

  // ── Drilldown: chi tiết hóa đơn (kèm giá vốn/lợi nhuận) ──
  if (drill) {
    return (
      <SaleProfitInvoiceDrilldown
        filters={filters}
        title={drill.title}
        override={drill.override}
        onBack={() => setDrill(null)}
      />
    );
  }

  // View PurchaseDate đã có dòng tổng trong bảng → ẩn thanh summary xám.
  const showSummaryBar = viewType !== "PurchaseDate";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
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
        {canExport("ban-hang") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            onExportDetail={
              (data?.viewType ?? viewType) === "Refund"
                ? undefined
                : handleExportDetail
            }
            disabled={rows.length === 0}
          />
        )}
      </div>

      {/* Summary bar (các view không phải PurchaseDate) */}
      {showSummaryBar && summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {viewType === "Profit" ? (
            <>
              <div>
                <span className="text-gray-500">Doanh thu:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.totalRevenue || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Giá vốn:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(summary.totalCost || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lợi nhuận:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {formatCurrency(
                    (summary.totalRevenue || 0) - (summary.totalCost || 0)
                  )}
                </span>
              </div>
            </>
          ) : viewType === "Refund" ? (
            <>
              <div>
                <span className="text-gray-500">Tổng giá trị trả:</span>{" "}
                <span className="font-semibold text-red-600">
                  {formatCurrency(summary.totalReturnAmount || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Đã hoàn tiền:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(summary.totalRefundAmount || 0)}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-gray-500">Tổng doanh thu:</span>{" "}
              <span className="font-semibold text-brand-dark">
                {formatCurrency(summary.totalValue || 0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
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
        ) : data?.viewType === "PurchaseDate" ? (
          <PurchaseDateTable
            rows={rows as SaleByDateRow[]}
            summary={summary}
            onSelectDate={(iso, label) =>
              setDrill({
                title: `Chi tiết chứng từ bán hàng — ${label}`,
                override: fullDayRange(iso),
              })
            }
          />
        ) : data?.viewType === "Refund" ? (
          <RefundTable rows={rows as SaleRefundRow[]} summary={summary} />
        ) : (
          <AggregateTable
            rows={rows as SaleChartRow[]}
            viewType={(data?.viewType as SaleViewType) ?? viewType}
            subjectHeader={subjectHeader}
            summary={summary}
            onSelectSubject={(row) => {
              const dv = data?.viewType ?? viewType;
              if (dv === "Profit") {
                if (!row.extraOrderBy) return;
                setDrill({
                  title: `Chi tiết lợi nhuận — ${row.subject}`,
                  override: fullDayRange(row.extraOrderBy),
                });
              } else if (dv === "SoldBy") {
                if (!row.extra1) return;
                setDrill({
                  title: `Chi tiết hóa đơn — NV ${row.subject}`,
                  override: { soldById: Number(row.extra1) },
                });
              } else if (dv === "Branch") {
                if (!row.extra1) return;
                setDrill({
                  title: `Chi tiết hóa đơn — CN ${row.subject}`,
                  override: { branchId: Number(row.extra1) },
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Bảng "Theo thời gian" — đủ cột + dòng tổng + link ngày ──
function PurchaseDateTable({
  rows,
  summary,
  onSelectDate,
}: {
  rows: SaleByDateRow[];
  summary?: import("@/lib/api/reports").SalePreviewSummary;
  onSelectDate: (iso: string, label: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-sky-100 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
            Thời gian
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            SL đơn bán
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Tổng tiền hàng
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Giảm giá
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Doanh thu
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            SL đơn trả
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Giá trị trả
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
            Doanh thu thuần
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {/* Dòng tổng */}
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2 text-gray-800" />
            <td className="px-3 py-2 text-right text-gray-900">
              {(summary.totalOrderCount || 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {formatCurrency(summary.totalAmount || 0)}
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {formatCurrency(summary.totalDiscount || 0)}
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {formatCurrency(summary.totalRevenue || 0)}
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {(summary.totalReturnCount || 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-red-600">
              {summary.totalReturnAmount
                ? `-${formatCurrency(summary.totalReturnAmount)}`
                : "0"}
            </td>
            <td className="px-3 py-2 text-right text-brand-dark">
              {formatCurrency(summary.totalNetRevenue || 0)}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.dateIso} className="hover:bg-gray-50">
            <td className="px-3 py-2">
              <button
                type="button"
                onClick={() => onSelectDate(row.dateIso, row.label)}
                className="text-brand hover:underline font-medium">
                {row.label}
              </button>
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {(row.orderCount ?? 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right">
              {formatCurrency(row.totalAmount)}
            </td>
            <td className="px-3 py-2 text-right text-gray-600">
              {formatCurrency(row.discount)}
            </td>
            <td className="px-3 py-2 text-right font-medium">
              {formatCurrency(row.revenue)}
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {(row.returnCount ?? 0).toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right text-red-600">
              {row.returnAmount ? `-${formatCurrency(row.returnAmount)}` : "0"}
            </td>
            <td className="px-3 py-2 text-right font-medium text-brand-dark">
              {formatCurrency(row.netRevenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Drilldown: danh sách hóa đơn kèm giá vốn + lợi nhuận ──
function SaleProfitInvoiceDrilldown({
  filters,
  title,
  override,
  onBack,
}: {
  filters: SaleReportFilters;
  title: string;
  override: Partial<SaleReportFilters>;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useSaleProfitInvoices({
    ...filters,
    ...override,
    page,
    limit,
  });

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const summary = data?.summary;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
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

      {/* Table */}
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
            Không có hóa đơn
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
                  Nhân viên
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Doanh thu
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Giá vốn
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Lợi nhuận
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Dòng tổng */}
              {summary && page === 1 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={4}>
                    SL giao dịch: {summary.totalInvoices}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-600">
                    {formatCurrency(summary.totalCost)}
                  </td>
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {formatCurrency(summary.totalProfit)}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    <CodeLink entity="invoice" code={row.code} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.soldByName || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-gray-900">{row.customerName}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-600">
                    {formatCurrency(row.cost)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-brand-dark">
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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

function AggregateTable({
  rows,
  viewType,
  subjectHeader,
  onSelectSubject,
  summary,
}: {
  rows: SaleChartRow[];
  viewType: SaleViewType;
  subjectHeader: string;
  onSelectSubject?: (row: SaleChartRow) => void;
  summary?: SalePreviewSummary;
}) {
  const isProfit = viewType === "Profit";
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
              Doanh thu
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-800">Tổng</td>
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

function RefundTable({
  rows,
  summary,
}: {
  rows: SaleRefundRow[];
  summary?: SalePreviewSummary;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            STT
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            Mã trả hàng
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            Ngày
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            Hóa đơn
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            Khách hàng
          </th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
            Chi nhánh
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Giá trị trả
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Đã hoàn tiền
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" colSpan={6}>
              <span className="text-gray-800">Tổng</span>
            </td>
            <td className="px-3 py-2 text-right text-red-600">
              {formatCurrency(summary.totalReturnAmount || 0)}
            </td>
            <td className="px-3 py-2 text-right text-orange-600">
              {formatCurrency(summary.totalRefundAmount || 0)}
            </td>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={row.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-2 font-medium text-brand-dark">
              {row.code}
            </td>
            <td className="px-3 py-2 text-gray-600">
              {formatDate(row.createdAt)}
            </td>
            <td className="px-3 py-2">
              {row.invoiceCode ? (
                <CodeLink entity="invoice" code={row.invoiceCode} />
              ) : (
                "-"
              )}
            </td>
            <td className="px-3 py-2 text-gray-900">{row.customerName}</td>
            <td className="px-3 py-2 text-gray-600">{row.branchName || "-"}</td>
            <td className="px-3 py-2 text-right text-red-600 font-medium">
              {formatCurrency(row.totalReturnAmount)}
            </td>
            <td className="px-3 py-2 text-right text-orange-600">
              {formatCurrency(row.refundAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
