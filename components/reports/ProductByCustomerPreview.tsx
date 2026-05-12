"use client";

import { useState } from "react";
import { useProductByCustomerReport } from "@/lib/hooks/useReports";
import { reportsApi, ReportFilters } from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

const CONDITION_LABELS: Record<string, string> = {
  normal: "Bình thường",
  damaged: "Lỗi/Hỏng",
  near_expiry: "Gần hết hạn",
};

interface Props {
  filters: ReportFilters;
}

export function ProductByCustomerPreview({ filters }: Props) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useProductByCustomerReport({
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
      await reportsApi.exportProductByCustomer(exportFilters);
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
            Hàng bán theo khách
          </h2>
          <span className="text-sm text-gray-500">• {total} dòng</span>
        </div>
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
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-4 py-2 bg-gray-50 border-b grid grid-cols-3 gap-4 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Tổng dòng:</span>{" "}
            <span className="font-semibold">
              {summary.totalRows.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Tổng SL:</span>{" "}
            <span className="font-semibold">
              {formatCurrency(summary.totalQuantity)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Tổng thành tiền:</span>{" "}
            <span className="font-semibold text-blue-700">
              {formatCurrency(summary.totalPrice)}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
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
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Mã HĐ
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Ngày bán
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Chi nhánh
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Mã SP
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Tên SP
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">
                  ĐVT
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  SL
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Giá bán
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Thành tiền
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">
                  Tình trạng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{row.customerName}</div>
                    <div className="text-xs text-gray-400">
                      {row.customerCode}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium text-blue-700">
                    {row.invoiceCode}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.branchName || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.productCode}</td>
                  <td className="px-3 py-2 text-gray-900">{row.productName}</td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {row.unit || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.sellingPrice)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700">
                    {formatCurrency(row.totalPrice)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${row.conditionType === "normal" ? "bg-green-100 text-green-800" : row.conditionType === "damaged" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {CONDITION_LABELS[row.conditionType] || row.conditionType}
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
