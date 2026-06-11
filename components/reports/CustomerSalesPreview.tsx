"use client";

import { useState } from "react";
import { useCustomerSalesReport } from "@/lib/hooks/useReports";
import { reportsApi, ReportFilters } from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { CodeLink } from "@/components/shared/CodeLink";
import { useReportAccess } from "@/lib/permissions/reportPermissions";

const STATUS_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-yellow-100 text-yellow-800",
  5: "bg-orange-100 text-orange-800",
  6: "bg-purple-100 text-purple-800",
  7: "bg-teal-100 text-teal-800",
  8: "bg-pink-100 text-pink-800",
};

interface Props {
  filters: ReportFilters;
}

export function CustomerSalesPreview({ filters }: Props) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [exporting, setExporting] = useState(false);
  const { canExport } = useReportAccess();

  const { data, isLoading } = useCustomerSalesReport({
    ...filters,
    page,
    limit,
  });

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const summary = data?.summary;

  const handleExport = async () => {
    setExporting(true);
    try {
      const { page: _, limit: __, ...exportFilters } = filters;
      await reportsApi.exportCustomerSales(exportFilters);
      toast.success("Xuất file thành công");
    } catch (err: any) {
      toast.error(err.message || "Xuất file thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Báo cáo bán hàng
          </h2>
          <span className="text-sm text-gray-500">• {total} hóa đơn</span>
        </div>
        {canExport("khach-hang") && (
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Xuất Excel
          </button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-4 py-2 bg-gray-50 border-b grid grid-cols-4 gap-4 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Tổng thành tiền:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.totalGrandTotal)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Đã thanh toán:</span>{" "}
            <span className="font-semibold text-green-700">
              {formatCurrency(summary.totalPaidAmount)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Còn nợ:</span>{" "}
            <span className="font-semibold text-orange-600">
              {formatCurrency(summary.totalDebtAmount)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Doanh thu thuần:</span>{" "}
            <span className="font-semibold text-brand-dark">
              {formatCurrency(summary.netRevenue)}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Không có dữ liệu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  STT
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Mã HĐ
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Ngày bán
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Chi nhánh
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  NV bán
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Thành tiền
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Đã TT
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Còn nợ
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Trả hàng
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    <CodeLink entity="invoice" code={row.code} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">
                      {row.customer?.name || "Khách vãng lai"}
                    </div>
                    {row.customer?.code && (
                      <div className="text-xs text-gray-400">
                        <CodeLink
                          entity="customer"
                          code={row.customer.code}
                          className="text-brand hover:underline"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.branch?.name || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.soldBy?.name || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.grandTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {formatCurrency(row.paidAmount)}
                  </td>
                  <td className="px-3 py-2 text-right text-orange-600">
                    {row.debtAmount > 0 ? formatCurrency(row.debtAmount) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {row.returnAmount > 0
                      ? formatCurrency(row.returnAmount)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[row.status] || "bg-gray-100 text-gray-700"}`}>
                      {row.statusValue}
                    </span>
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
