"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { useEodPreview } from "@/lib/hooks/useReports";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  eodReportApi,
  EodReportFilters,
  EodViewType,
  EodSyntheticResponse,
  EodDocumentResponse,
  EodCashResponse,
  EodProductResponse,
} from "@/lib/api/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  filters: EodReportFilters;
  viewType: EodViewType;
}

const VIEW_TITLE: Record<EodViewType, string> = {
  Synthetic: "Tổng hợp cuối ngày",
  Document: "Chứng từ trong ngày",
  CashFlow: "Thu chi tiền trong ngày",
  Product: "Hàng bán trong ngày",
};

export function EodPanel({ filters, viewType }: Props) {
  const { data, isLoading, isError, refetch } = useEodPreview(filters);
  const { canExport } = useReportAccess();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await eodReportApi.exportExcel(filters);
      toast.success("Xuất file thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xuất file thất bại");
    } finally {
      setExporting(false);
    }
  };

  const hasData =
    !!data &&
    (data.viewType === "Synthetic" ? true : (data.data?.length ?? 0) > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
          {VIEW_TITLE[viewType]}
        </h2>
        {canExport("cuoi-ngay") && (
          <button
            onClick={handleExport}
            disabled={exporting || !hasData}
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
        ) : !data ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Không có dữ liệu
          </div>
        ) : data.viewType === "Synthetic" ? (
          <SyntheticView data={data} />
        ) : data.viewType === "Document" ? (
          <DocumentView data={data} />
        ) : data.viewType === "CashFlow" ? (
          <CashView data={data} />
        ) : (
          <ProductView data={data} />
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent || "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}

function SyntheticView({ data }: { data: EodSyntheticResponse }) {
  const m = data.metrics;
  return (
    <div className="p-4">
      <div className="text-sm text-gray-500 mb-3">Ngày {data.date}</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="Số hóa đơn" value={m.invoiceCount.toLocaleString("vi-VN")} />
        <Kpi
          label="Doanh thu"
          value={formatCurrency(m.revenue)}
          accent="text-brand-dark"
        />
        <Kpi
          label="Doanh thu thuần"
          value={formatCurrency(m.netRevenue)}
          accent="text-brand-dark"
        />
        <Kpi
          label="Số phiếu trả"
          value={m.returnCount.toLocaleString("vi-VN")}
        />
        <Kpi
          label="Giá trị trả hàng"
          value={formatCurrency(m.returnAmount)}
          accent="text-red-600"
        />
        <Kpi
          label="Tiền thu"
          value={formatCurrency(m.cashReceipt)}
          accent="text-green-700"
        />
        <Kpi
          label="Tiền chi"
          value={formatCurrency(m.cashPayment)}
          accent="text-red-600"
        />
        <Kpi
          label="Quỹ ròng"
          value={formatCurrency(m.cashNet)}
          accent="text-brand-dark"
        />
        <Kpi
          label="Giá trị nhập hàng"
          value={formatCurrency(m.purchaseTotal)}
          accent="text-orange-600"
        />
      </div>
    </div>
  );
}

function DocumentView({ data }: { data: EodDocumentResponse }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-sky-100 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Mã HĐ
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Thời gian
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Nhân viên
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Khách hàng
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700">
            Doanh thu
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr className="bg-amber-50 font-semibold">
          <td className="px-3 py-2 text-gray-800" colSpan={4}>
            SL giao dịch: {data.summary.totalInvoices}
          </td>
          <td className="px-3 py-2 text-right text-brand-dark">
            {formatCurrency(data.summary.totalRevenue)}
          </td>
        </tr>
        {data.data.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-brand-dark">
              <CodeLink entity="invoice" code={r.code} />
            </td>
            <td className="px-3 py-2 text-gray-600">
              {formatDate(r.purchaseDate)}
            </td>
            <td className="px-3 py-2 text-gray-600">{r.soldByName || "-"}</td>
            <td className="px-3 py-2 text-gray-900">{r.customerName}</td>
            <td className="px-3 py-2 text-right font-medium">
              {formatCurrency(r.grandTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CashView({ data }: { data: EodCashResponse }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-sky-100 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Mã phiếu
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Thời gian
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Loại
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Nhóm
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Đối tượng
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700">
            Số tiền
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr className="bg-amber-50 font-semibold">
          <td className="px-3 py-2 text-gray-800" colSpan={5}>
            SL phiếu: {data.summary.totalDocuments} · Thu{" "}
            {formatCurrency(data.summary.totalReceipt)} · Chi{" "}
            {formatCurrency(data.summary.totalPayment)}
          </td>
          <td className="px-3 py-2 text-right text-brand-dark">
            {formatCurrency(
              data.summary.totalReceipt - data.summary.totalPayment
            )}
          </td>
        </tr>
        {data.data.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-brand-dark">{r.code}</td>
            <td className="px-3 py-2 text-gray-600">
              {formatDate(r.transDate)}
            </td>
            <td className="px-3 py-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isReceipt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                {r.isReceipt ? "Thu" : "Chi"}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-600">{r.groupName || "-"}</td>
            <td className="px-3 py-2 text-gray-700">{r.partnerName || "-"}</td>
            <td
              className={`px-3 py-2 text-right font-medium ${r.isReceipt ? "text-green-700" : "text-red-600"}`}>
              {formatCurrency(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductView({ data }: { data: EodProductResponse }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-sky-100 sticky top-0 z-10">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            STT
          </th>
          <th className="px-3 py-2 text-left font-semibold text-gray-700">
            Sản phẩm
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700">
            SL bán
          </th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700">
            Doanh thu
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr className="bg-amber-50 font-semibold">
          <td className="px-3 py-2 text-gray-800" colSpan={2}>
            Tổng {data.summary.totalRows} sản phẩm
          </td>
          <td className="px-3 py-2 text-right text-gray-900">
            {data.summary.totalQuantity.toLocaleString("vi-VN")}
          </td>
          <td className="px-3 py-2 text-right text-brand-dark">
            {formatCurrency(data.summary.totalRevenue)}
          </td>
        </tr>
        {data.data.map((r, idx) => (
          <tr key={r.code || idx} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-2 text-gray-900">{r.name}</td>
            <td className="px-3 py-2 text-right text-gray-700">
              {r.quantity.toLocaleString("vi-VN")}
            </td>
            <td className="px-3 py-2 text-right font-medium">
              {formatCurrency(r.revenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
