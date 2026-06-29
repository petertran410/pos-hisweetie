"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useCustomerPreview,
  useCustomerInvoices,
  useCustomerDebtCustomers,
  useCustomerDebtDocuments,
} from "@/lib/hooks/useReports";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  customerReportApi,
  CustomerReportFilters,
  CustomerViewType,
  CustomerChartRow,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: CustomerReportFilters;
  viewType: CustomerViewType;
}

const VIEW_TITLE: Record<CustomerViewType, string> = {
  CustomerBySale: "Bán hàng theo khách",
  CustomerByProfit: "Lợi nhuận theo khách",
  CustomerDebt: "Công nợ theo khách",
  CustomerByProduct: "Hàng bán theo khách",
};

export function CustomerDataPanel({ filters, viewType }: Props) {
  if (viewType === "CustomerDebt") {
    return <CustomerDebtPanel filters={filters} />;
  }
  return <CustomerSummaryPanel filters={filters} viewType={viewType} />;
}

// ════════════════════════════════════════════════════════════════════════════
// Sale / Profit / Product: Lv1 bảng tổng hợp theo KH → Lv2 dòng hóa đơn
// ════════════════════════════════════════════════════════════════════════════
function CustomerSummaryPanel({
  filters,
  viewType,
}: {
  filters: CustomerReportFilters;
  viewType: CustomerViewType;
}) {
  const { data, isLoading, isError, refetch } = useCustomerPreview(filters);
  const { canExport } = useReportAccess();
  const [drill, setDrill] = useState<{ title: string; code: string } | null>(
    null,
  );

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;
  const isProfit = viewType === "CustomerByProfit";

  const handleExportOverview = async () => {
    try {
      await customerReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const handleExportDetail = async () => {
    try {
      await customerReportApi.exportDetail(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  if (drill) {
    return (
      <CustomerInvoiceDrilldown
        filters={filters}
        viewType={viewType}
        title={drill.title}
        code={drill.code}
        onBack={() => setDrill(null)}
      />
    );
  }

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
        {canExport("khach-hang") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            onExportDetail={handleExportDetail}
            disabled={rows.length === 0}
          />
        )}
      </div>

      {summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {isProfit ? (
            <>
              <div>
                <span className="text-gray-500">Doanh thu:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.totalRevenue || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Giá vốn:</span>{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.totalCost || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lợi nhuận:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {formatCurrency(summary.totalValue || 0)}
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
                  Mã KH
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Khách hàng
                </th>
                {isProfit ? (
                  <>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                      Doanh thu
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                      Giá vốn
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                      Lợi nhuận
                    </th>
                  </>
                ) : (
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                    Doanh thu
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: CustomerChartRow, idx: number) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    row.extra1 &&
                    setDrill({ title: row.subject, code: row.extra1 })
                  }>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.extra1 || ""}
                  </td>
                  <td className="px-3 py-2 text-gray-900">{row.subject}</td>
                  {isProfit ? (
                    <>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {(row.revenue || 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {(row.totalCost || 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-brand-dark">
                        {(row.profit || 0).toLocaleString("vi-VN")}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2 text-right font-medium text-brand-dark">
                      {(row.value || 0).toLocaleString("vi-VN")}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Drilldown Lv2: dòng hóa đơn của 1 KH ──
function CustomerInvoiceDrilldown({
  filters,
  viewType,
  title,
  code,
  onBack,
}: {
  filters: CustomerReportFilters;
  viewType: CustomerViewType;
  title: string;
  code: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = filters.limit ?? 500;
  const isProfit = viewType === "CustomerByProfit";

  const { data, isLoading, isError, refetch } = useCustomerInvoices({
    ...filters,
    customerKeyword: code,
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
                  Sản phẩm
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  SL
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Đơn giá
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Thành tiền
                </th>
                {isProfit && (
                  <>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                      Giá vốn
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                      Lợi nhuận
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && page === 1 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={3}>
                    SL dòng: {summary.totalInvoices}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">
                    {summary.totalQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                  {isProfit && (
                    <>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCurrency(summary.totalCost)}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-dark">
                        {formatCurrency(summary.totalProfit)}
                      </td>
                    </>
                  )}
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
                  <td className="px-3 py-2 text-gray-700">{row.productName}</td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.quantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(row.price)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.totalPrice)}
                  </td>
                  {isProfit && (
                    <>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {formatCurrency(row.cost)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-brand-dark">
                        {formatCurrency(row.profit)}
                      </td>
                    </>
                  )}
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
              {"\u2039"}
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
              {"\u203a"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Debt: Lv1 nhóm rank → Lv2 danh sách KH → Lv3 chứng từ công nợ
// ════════════════════════════════════════════════════════════════════════════
function CustomerDebtPanel({ filters }: { filters: CustomerReportFilters }) {
  const { data, isLoading, isError, refetch } = useCustomerPreview(filters);
  const { canExport } = useReportAccess();
  const [group, setGroup] = useState<{
    title: string;
    rankStart: number;
    rankEnd: number;
  } | null>(null);

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;

  const handleExportOverview = async () => {
    try {
      await customerReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  if (group) {
    return (
      <CustomerDebtCustomersPanel
        filters={filters}
        title={group.title}
        rankStart={group.rankStart}
        rankEnd={group.rankEnd}
        onBack={() => setGroup(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Công nợ theo khách
          </h2>
          {summary && (
            <span className="text-sm text-gray-500">
              • {summary.totalRows} khách hàng
            </span>
          )}
        </div>
        {canExport("khach-hang") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            disabled={rows.length === 0}
          />
        )}
      </div>

      {summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Nợ đầu kỳ:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.totalOpening || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Ghi nợ:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.totalDebit || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Ghi có:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.totalCredit || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Nợ cuối kỳ:</span>{" "}
            <span className="font-semibold text-brand-dark">
              {formatCurrency(summary.totalClosing || 0)}
            </span>
          </div>
        </div>
      )}

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
                  Nhóm khách hàng theo nợ cuối kỳ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Nợ đầu kỳ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi nợ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi có
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Nợ cuối kỳ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: CustomerChartRow, idx: number) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    row.rankStart != null &&
                    row.rankEnd != null &&
                    setGroup({
                      title: row.subject,
                      rankStart: row.rankStart,
                      rankEnd: row.rankEnd,
                    })
                  }>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {(row.opening || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {(row.debit || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {(row.credit || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-brand-dark">
                    {(row.closing || 0).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Debt Lv2: danh sách KH trong nhóm rank ──
function CustomerDebtCustomersPanel({
  filters,
  title,
  rankStart,
  rankEnd,
  onBack,
}: {
  filters: CustomerReportFilters;
  title: string;
  rankStart: number;
  rankEnd: number;
  onBack: () => void;
}) {
  const { data, isLoading, isError, refetch } = useCustomerDebtCustomers({
    ...filters,
    rankStart,
    rankEnd,
  });
  const [customer, setCustomer] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const rows = data?.data || [];
  const summary = data?.summary;

  if (customer) {
    return (
      <CustomerDebtDocumentsPanel
        filters={filters}
        customerId={customer.id}
        title={customer.name}
        onBack={() => setCustomer(null)}
      />
    );
  }

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
        {summary && (
          <span className="text-sm text-gray-500">
            • {summary.totalCustomers} khách hàng
          </span>
        )}
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
                  Mã KH
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Nợ đầu kỳ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi nợ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi có
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Nợ cuối kỳ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.customerId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    setCustomer({
                      id: row.customerId,
                      name: row.customerName,
                    })
                  }>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.customerCode}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {row.customerName}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.openingDebt.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.debit.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.credit.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-brand-dark">
                    {row.closingDebt.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Debt Lv3: chi tiết chứng từ công nợ 1 KH ──
function CustomerDebtDocumentsPanel({
  filters,
  customerId,
  title,
  onBack,
}: {
  filters: CustomerReportFilters;
  customerId: number;
  title: string;
  onBack: () => void;
}) {
  const { canExport } = useReportAccess();
  const { data, isLoading, isError, refetch } = useCustomerDebtDocuments({
    ...filters,
    customerId,
  });

  const rows = data?.data || [];
  const summary = data?.summary;

  const handleExport = async () => {
    try {
      await customerReportApi.exportDebtDocuments({ ...filters, customerId });
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
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
        {canExport("khach-hang") && (
          <ExportMenu onExportOverview={handleExport} disabled={!summary} />
        )}
      </div>

      {summary && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          <div>
            <span className="text-gray-500">Nợ đầu kỳ:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(summary.openingDebt)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Nợ cuối kỳ:</span>{" "}
            <span className="font-semibold text-brand-dark">
              {formatCurrency(summary.closingDebt)}
            </span>
          </div>
        </div>
      )}

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
            Không có phát sinh công nợ trong kỳ
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sky-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Thời gian
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Mã chứng từ
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Loại
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi nợ
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Ghi có
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Dư nợ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={5}>
                    Dư nợ đầu kỳ
                  </td>
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {formatCurrency(summary.openingDebt)}
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.code}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.type}</td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.debit ? formatCurrency(row.debit) : ""}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {row.credit ? formatCurrency(row.credit) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
