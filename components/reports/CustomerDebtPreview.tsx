"use client";

import { useState } from "react";
import { useCustomerDebtReport } from "@/lib/hooks/useReports";
import { reportsApi, ReportFilters } from "@/lib/api/reports";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: ReportFilters;
}

export function CustomerDebtPreview({ filters }: Props) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useCustomerDebtReport({
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
      await reportsApi.exportCustomerDebt(exportFilters);
      toast.success("Xuất file thành công");
    } catch (err: any) {
      toast.error(err.message || "Xuất file thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Báo cáo công nợ
          </h2>
          <span className="text-sm text-gray-500">• {total} khách</span>
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

      {summary && (
        <div className="px-4 py-2 bg-gray-50 border-b grid grid-cols-4 gap-4 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Nợ đầu kỳ:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.totalOpening)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Ghi nợ:</span>{" "}
            <span className="font-semibold text-brand-dark">
              {formatCurrency(summary.totalDebit)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Ghi có:</span>{" "}
            <span className="font-semibold text-green-700">
              {formatCurrency(summary.totalCredit)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Nợ cuối kỳ:</span>{" "}
            <span className="font-semibold text-orange-600">
              {formatCurrency(summary.totalClosing)}
            </span>
          </div>
        </div>
      )}

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
                  Mã KH
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  SĐT
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  Nhóm KH
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Nợ đầu kỳ
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Ghi nợ
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Ghi có
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                  Nợ cuối kỳ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row.customerId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.customerCode ? (
                      <CodeLink entity="customer" code={row.customerCode} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {row.customerName}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.contactNumber || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                    {row.customerGroups || "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.openingDebt)}
                  </td>
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-orange-600">
                    {formatCurrency(row.closingDebt)}
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
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
              «
            </button>
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
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
