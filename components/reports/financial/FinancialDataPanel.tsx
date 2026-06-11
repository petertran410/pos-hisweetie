"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useFinancialPreview,
  useFinancialCashFlows,
  useSaleProfitInvoices,
} from "@/lib/hooks/useReports";
import {
  financialReportApi,
  saleReportApi,
  FinancialReportFilters,
  FinancialViewType,
  FinancialChartRow,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useReportAccess } from "@/lib/permissions/reportPermissions";

interface Props {
  filters: FinancialReportFilters;
  viewType: FinancialViewType;
}

// Drilldown: kind quyết định nguồn dữ liệu (phiếu thu/chi hay hóa đơn)
interface FinDrillState {
  kind: "cash" | "invoice";
  title: string;
  override: Partial<FinancialReportFilters>;
}

const VIEW_TITLE: Record<FinancialViewType, string> = {
  CashByGroup: "Thu chi theo nhóm",
  CashByTime: "Thu chi theo thời gian",
  CashFlowSummary: "Sổ quỹ",
  SalePerformance: "Hiệu quả kinh doanh",
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

export function FinancialDataPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useFinancialPreview(filters);
  const { canExport } = useReportAccess();
  const [drill, setDrill] = useState<FinDrillState | null>(null);

  const rows = useMemo(() => data?.data || [], [data]);
  const summary = data?.summary;

  const handleExportOverview = async () => {
    try {
      await financialReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  const handleExportDetail = async () => {
    try {
      if ((data?.viewType ?? viewType) === "SalePerformance") {
        // Chi tiết là hóa đơn (kèm lợi nhuận)
        await saleReportApi.exportDetail({
          branchId: filters.branchId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });
      } else {
        await financialReportApi.exportDetail(filters);
      }
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    }
  };

  if (drill) {
    return drill.kind === "invoice" ? (
      <PerformanceInvoiceDrilldown
        filters={filters}
        title={drill.title}
        override={drill.override}
        onBack={() => setDrill(null)}
      />
    ) : (
      <CashFlowDrilldown
        filters={filters}
        title={drill.title}
        override={drill.override}
        onBack={() => setDrill(null)}
      />
    );
  }

  const isPerf = viewType === "SalePerformance";

  // Xây drilldown theo từng view + dòng được click
  const handleSelect = (row: FinancialChartRow) => {
    const dv = data?.viewType ?? viewType;
    if (dv === "CashByGroup") {
      setDrill({
        kind: "cash",
        title: `Phiếu thu chi — ${row.subject}`,
        override: row.extra1 ? { cashFlowGroupId: Number(row.extra1) } : {},
      });
    } else if (dv === "CashByTime") {
      if (!row.extra1) return;
      setDrill({
        kind: "cash",
        title: `Phiếu thu chi — ${row.subject}`,
        override: fullDayRange(row.extra1),
      });
    } else if (dv === "CashFlowSummary") {
      // Chỉ Tổng thu / Tổng chi mới drill được
      if (row.extra1 !== "receipt" && row.extra1 !== "payment") return;
      setDrill({
        kind: "cash",
        title: `${row.subject} — chi tiết phiếu`,
        override: { direction: row.extra1 },
      });
    } else if (dv === "SalePerformance") {
      if (!row.extra1) return;
      setDrill({
        kind: "invoice",
        title: `Hiệu quả kinh doanh — ${row.subject}`,
        override: fullDayRange(row.extra1),
      });
    }
  };

  // Dòng có drill được hay không (Sổ quỹ: chỉ 2 dòng tổng thu/chi)
  const isRowDrillable = (row: FinancialChartRow) => {
    const dv = data?.viewType ?? viewType;
    if (dv === "CashFlowSummary")
      return row.extra1 === "receipt" || row.extra1 === "payment";
    return true;
  };

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
        {canExport("tai-chinh") && (
          <ExportMenu
            onExportOverview={handleExportOverview}
            onExportDetail={handleExportDetail}
            disabled={rows.length === 0}
          />
        )}
      </div>

      {summary && rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-x-8 gap-y-1 text-sm shrink-0">
          {isPerf ? (
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
          ) : (
            <>
              <div>
                <span className="text-gray-500">Tổng thu:</span>{" "}
                <span className="font-semibold text-green-700">
                  {formatCurrency(summary.totalReceipt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tổng chi:</span>{" "}
                <span className="font-semibold text-red-600">
                  {formatCurrency(summary.totalPayment)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Chênh lệch:</span>{" "}
                <span className="font-semibold text-brand-dark">
                  {formatCurrency(summary.totalReceipt - summary.totalPayment)}
                </span>
              </div>
            </>
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
        ) : isPerf ? (
          <PerformanceTable
            rows={rows}
            onSelectSubject={handleSelect}
            summary={summary}
          />
        ) : (
          <CashTable
            rows={rows}
            onSelectSubject={handleSelect}
            isRowDrillable={isRowDrillable}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
}

function CashTable({
  rows,
  onSelectSubject,
  isRowDrillable,
  summary,
}: {
  rows: FinancialChartRow[];
  onSelectSubject?: (row: FinancialChartRow) => void;
  isRowDrillable?: (row: FinancialChartRow) => boolean;
  summary?: {
    totalReceipt: number;
    totalPayment: number;
    totalRevenue: number;
    totalCost: number;
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
            Mục
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Thu
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Chi
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Chênh lệch
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-800">Tổng</td>
            <td className="px-3 py-2 text-right text-green-700">
              {formatCurrency(summary.totalReceipt || 0)}
            </td>
            <td className="px-3 py-2 text-right text-red-600">
              {formatCurrency(summary.totalPayment || 0)}
            </td>
            <td className="px-3 py-2 text-right text-brand-dark">
              {formatCurrency(
                (summary.totalReceipt || 0) - (summary.totalPayment || 0)
              )}
            </td>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-2">
              {onSelectSubject && (!isRowDrillable || isRowDrillable(row)) ? (
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
            <td className="px-3 py-2 text-right text-green-700">
              {formatCurrency(row.receipt || 0)}
            </td>
            <td className="px-3 py-2 text-right text-red-600">
              {formatCurrency(row.payment || 0)}
            </td>
            <td className="px-3 py-2 text-right font-medium text-brand-dark">
              {formatCurrency(row.net || 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PerformanceTable({
  rows,
  onSelectSubject,
  summary,
}: {
  rows: FinancialChartRow[];
  onSelectSubject?: (row: FinancialChartRow) => void;
  summary?: {
    totalReceipt: number;
    totalPayment: number;
    totalRevenue: number;
    totalCost: number;
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
            Thời gian
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Doanh thu
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Giá vốn
          </th>
          <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
            Lợi nhuận
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary && (
          <tr className="bg-amber-50 font-semibold">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-800">Tổng</td>
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
            <td className="px-3 py-2 text-right">
              {formatCurrency(row.revenue || 0)}
            </td>
            <td className="px-3 py-2 text-right text-orange-600">
              {formatCurrency(row.cost || 0)}
            </td>
            <td className="px-3 py-2 text-right font-medium text-brand-dark">
              {formatCurrency(row.profit || 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Drilldown: danh sách phiếu thu/chi ──
function CashFlowDrilldown({
  filters,
  title,
  override,
  onBack,
}: {
  filters: FinancialReportFilters;
  title: string;
  override: Partial<FinancialReportFilters>;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useFinancialCashFlows({
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
            Không có phiếu thu chi
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
                  Loại
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Nhóm
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  Đối tượng
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  Số tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary && page === 1 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-3 py-2 text-gray-800" colSpan={5}>
                    SL phiếu: {summary.totalDocuments} · Thu{" "}
                    {formatCurrency(summary.totalReceipt)} · Chi{" "}
                    {formatCurrency(summary.totalPayment)}
                  </td>
                  <td className="px-3 py-2 text-right text-brand-dark">
                    {formatCurrency(
                      summary.totalReceipt - summary.totalPayment
                    )}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-brand-dark">
                    {row.code}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(row.transDate)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.isReceipt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      {row.isReceipt ? "Thu" : "Chi"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.groupName || "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {row.partnerName || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${row.isReceipt ? "text-green-700" : "text-red-600"}`}>
                    {formatCurrency(row.amount)}
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

// ── Drilldown: danh sách hóa đơn (kèm lợi nhuận) cho Hiệu quả kinh doanh ──
function PerformanceInvoiceDrilldown({
  filters,
  title,
  override,
  onBack,
}: {
  filters: FinancialReportFilters;
  title: string;
  override: Partial<FinancialReportFilters>;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 20;

  // useSaleProfitInvoices dùng SaleReportFilters; chỉ cần branchId + khoảng ngày
  const { data, isLoading, isError, refetch } = useSaleProfitInvoices({
    branchId: filters.branchId,
    fromDate: override.fromDate,
    toDate: override.toDate,
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
                  <td className="px-3 py-2 text-gray-900">{row.customerName}</td>
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
