"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useSupplierPreview, useSupplierPurchases } from "@/lib/hooks/useReports";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  supplierReportApi,
  SupplierReportFilters,
  SupplierViewType,
  SupplierChartRow,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: SupplierReportFilters;
  viewType: SupplierViewType;
}

const VIEW_TITLE: Record<SupplierViewType, string> = {
  PurchaseBySupplier: "Nhập theo nhà cung cấp",
  PurchaseByProduct: "Nhập theo sản phẩm",
  SupplierDebt: "Công nợ nhà cung cấp",
  SupplierReturn: "Trả hàng nhập",
  SupplierInfo: "Tổng hợp nhà cung cấp",
};

export function SupplierDataPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useSupplierPreview(filters);
  const { canExport } = useReportAccess();
  const [drill, setDrill] = useState<{
    title: string;
    supplierId?: number;
  } | null>(null);

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;

  const handleExportOverview = async () => {
    try {
      await supplierReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const handleExportDetail = async () => {
    try {
      await supplierReportApi.exportDetail(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  if (drill) {
    return (
      <SupplierPurchaseDrilldown
        filters={filters}
        title={drill.title}
        supplierId={drill.supplierId}
        onBack={() => setDrill(null)}
      />
    );
  }

  const isDebt = viewType === "SupplierDebt" || viewType === "SupplierInfo";
  // Drilldown chỉ cho các view group theo NCC (subject = NCC, extra1 = code → cần id)
  const drillable =
    viewType === "PurchaseBySupplier" || viewType === "SupplierDebt";
  const subjectHeader =
    viewType === "PurchaseByProduct" ? "Sản phẩm" : "Nhà cung cấp";

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
        {canExport("nha-cung-cap") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            onExportDetail={drillable ? handleExportDetail : undefined}
            disabled={rows.length === 0}
          />
        )}
      </div>

      {summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {isDebt ? (
            <>
              <div>
                <span className="text-gray-500">Tổng nhập:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.totalDebit)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Đã trả:</span>{" "}
                <span className="font-semibold text-green-700">
                  {formatCurrency(summary.totalCredit)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  {viewType === "SupplierInfo" ? "Còn nợ:" : "Còn lại kỳ:"}
                </span>{" "}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(summary.totalClosing)}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-gray-500">
                {viewType === "SupplierReturn"
                  ? "Tổng trả hàng:"
                  : "Tổng giá trị:"}
              </span>{" "}
              <span className="font-semibold text-brand-dark">
                {formatCurrency(summary.totalValue)}
              </span>
            </div>
          )}
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
        ) : (
          <SupplierAggregateTable
            rows={rows}
            isDebt={isDebt}
            subjectHeader={subjectHeader}
            infoMode={viewType === "SupplierInfo"}
            summary={summary}
            onSelectSubject={
              drillable
                ? (row) =>
                    setDrill({
                      title: `Phiếu nhập — ${row.subject}`,
                      supplierId: row.extra1
                        ? Number(row.extra1)
                        : filters.supplierId,
                    })
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function SupplierAggregateTable({
  rows,
  isDebt,
  subjectHeader,
  infoMode,
  onSelectSubject,
  summary,
}: {
  rows: SupplierChartRow[];
  isDebt: boolean;
  subjectHeader: string;
  infoMode: boolean;
  onSelectSubject?: (row: SupplierChartRow) => void;
  summary?: {
    totalValue: number;
    totalQuantity: number;
    totalDebit: number;
    totalCredit: number;
    totalClosing: number;
  };
}) {
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
          {isDebt ? (
            <>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Tổng nhập
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Đã trả
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                {infoMode ? "Còn nợ" : "Còn lại"}
              </th>
            </>
          ) : (
            <>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                SL
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                Giá trị
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-800">Tổng</td>
            {isDebt ? (
              <>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatCurrency(summary.totalDebit || 0)}
                </td>
                <td className="px-3 py-2 text-right text-green-700">
                  {formatCurrency(summary.totalCredit || 0)}
                </td>
                <td className="px-3 py-2 text-right text-orange-600">
                  {formatCurrency(summary.totalClosing || 0)}
                </td>
              </>
            ) : (
              <>
                <td className="px-3 py-2 text-right text-gray-900">
                  {(summary.totalQuantity || 0).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right text-brand-dark">
                  {formatCurrency(summary.totalValue || 0)}
                </td>
              </>
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
            {isDebt ? (
              <>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.debit || 0)}
                </td>
                <td className="px-3 py-2 text-right text-green-700">
                  {formatCurrency(row.credit || 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-orange-600">
                  {formatCurrency(row.closing || 0)}
                </td>
              </>
            ) : (
              <>
                <td className="px-3 py-2 text-right text-gray-700">
                  {(row.quantity || 0).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCurrency(row.value || 0)}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Drilldown: phiếu nhập của 1 NCC ──
function SupplierPurchaseDrilldown({
  filters,
  title,
  supplierId,
  onBack,
}: {
  filters: SupplierReportFilters;
  title: string;
  supplierId?: number;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useSupplierPurchases({
    ...filters,
    supplierId: supplierId ?? filters.supplierId,
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
            Không có phiếu nhập
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sky-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Mã phiếu
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Thời gian
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Chi nhánh
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Giá trị
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Đã trả
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Còn nợ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && page === 1 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={3}>
                    SL phiếu: {summary.totalDocuments}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {formatCurrency(summary.totalSubTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {formatCurrency(summary.totalPaid)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-600">
                    {formatCurrency(summary.totalDebt)}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    <CodeLink entity="purchase-order" code={row.code} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.branchName || "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.subTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {formatCurrency(row.paidAmount)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-600">
                    {row.debtAmount > 0 ? formatCurrency(row.debtAmount) : "-"}
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
