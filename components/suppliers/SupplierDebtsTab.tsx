"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  useSupplierDebtTimeline,
  useExportSupplierDebtTimeline,
  useExportSupplierDebt,
} from "@/lib/hooks/useSuppliers";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { SupplierPaymentBulkModal } from "./SupplierPaymentBulkModal";
import { CodeLink } from "../shared/CodeLink";
import {
  ExportDebtModal,
  ExportDebtOptions,
} from "../customers/ExportDebtModal";

interface SupplierDebtsTabProps {
  supplierId: number;
  supplierDebt: number;
}

export function SupplierDebtsTab({
  supplierId,
  supplierDebt,
}: SupplierDebtsTabProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportDebtModal, setShowExportDebtModal] = useState(false);

  const { data, isLoading } = useSupplierDebtTimeline(supplierId);
  const { exportToFile: exportTimeline, isExporting: exportingTimeline } =
    useExportSupplierDebtTimeline();
  const { exportToFile: exportDebt, isExporting: exportingDebt } =
    useExportSupplierDebt();

  const timeline = data?.data || [];
  const totalPages = Math.ceil(timeline.length / limit);
  const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

  const handleExportDebt = async (opts: ExportDebtOptions) => {
    const { preset, fromDate, toDate, ...rest } = opts;

    let from: string | undefined;
    let to: string | undefined;

    if (preset === "custom") {
      from = fromDate;
      to = toDate;
    } else if (preset !== "all_time") {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const toStr = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (preset === "today") {
        from = to = toStr(now);
      } else if (preset === "this_week") {
        const day = now.getDay() || 7;
        const mon = new Date(now);
        mon.setDate(now.getDate() - day + 1);
        from = toStr(mon);
        to = toStr(now);
      } else if (preset === "last_7_days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 6);
        from = toStr(d);
        to = toStr(now);
      } else if (preset === "last_30_days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 29);
        from = toStr(d);
        to = toStr(now);
      } else if (preset === "this_month") {
        from = toStr(new Date(now.getFullYear(), now.getMonth(), 1));
        to = toStr(now);
      } else if (preset === "last_month") {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        from = toStr(first);
        to = toStr(last);
      }
    }

    await exportDebt(supplierId, { fromDate: from, toDate: to, ...rest });
    setShowExportDebtModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-md text-gray-600">
          Nợ cần trả hiện tại:{" "}
          <span className="font-semibold text-red-600">
            {formatCurrency(supplierDebt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <button
            onClick={() => exportTimeline(supplierId)}
            disabled={exportingTimeline}
            className="px-2 py-1.5 lg:px-3 lg:py-2 border rounded hover:bg-gray-50 flex items-center gap-1 lg:gap-1.5 text-xs lg:text-sm text-gray-700 disabled:opacity-50">
            {exportingTimeline ? (
              <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            )}
            Lịch sử TT
          </button>

          <button
            onClick={() => setShowExportDebtModal(true)}
            disabled={exportingDebt}
            className="px-2 py-1.5 lg:px-3 lg:py-2 border rounded hover:bg-gray-50 flex items-center gap-1 lg:gap-1.5 text-xs lg:text-sm text-gray-700 disabled:opacity-50">
            {exportingDebt ? (
              <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            )}
            Công nợ
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark">
            💵 Trả tiền NCC
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-md font-medium">
                Mã phiếu
              </th>
              <th className="px-4 py-3 text-left text-md font-medium">
                Thời gian
              </th>
              <th className="px-4 py-3 text-left text-md font-medium">Loại</th>
              <th className="px-4 py-3 text-left text-md font-medium">
                Chi nhánh
              </th>
              <th className="px-4 py-3 text-right text-md font-medium">
                Giá trị
              </th>
              <th className="px-4 py-3 text-right text-md font-medium">
                Nợ cần trả NCC
              </th>
            </tr>
          </thead>
          <tbody>
            {timeline.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Chưa có giao dịch nào
                </td>
              </tr>
            ) : (
              paginatedTimeline.map((item: any) => {
                const isPurchase = item.type === "purchase";
                const isPayment = item.type === "payment";
                const isBalanceAdjustment = item.type === "balance_adjustment";
                const isSupplierReturn = item.type === "supplier_return";

                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {isPurchase ? (
                        <Link
                          href={`/san-pham/nhap-hang?Code=${item.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-md font-medium text-brand hover:underline">
                          {item.code}
                        </Link>
                      ) : isPayment ? (
                        <Link
                          href={`/tai-chinh/so-quy?Code=${item.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-md font-medium text-brand hover:underline">
                          {item.code}
                        </Link>
                      ) : isSupplierReturn ? (
                        <CodeLink
                          entity="supplier-return"
                          code={item.code}
                          className="text-md font-medium text-brand hover:underline"
                        />
                      ) : (
                        <span className="text-brand">{item.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-md">
                      {new Date(item.date).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-md">
                      {isPurchase
                        ? "Nhập hàng"
                        : isPayment
                          ? "Thanh toán"
                          : isBalanceAdjustment
                            ? "Cân bằng nợ"
                            : isSupplierReturn
                              ? item.refundType === "debt_offset"
                                ? "Cấn trừ nợ NCC"
                                : "Trả hàng nhập"
                              : "Khác"}
                    </td>
                    <td className="px-4 py-3 text-md">
                      {item.branch?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-md text-right">
                      <span
                        className={
                          isPurchase || isBalanceAdjustment
                            ? "text-red-600"
                            : "text-green-600"
                        }>
                        {isPurchase || isBalanceAdjustment ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-md text-right font-medium">
                      {formatCurrency(item.debtSnapshot)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-md disabled:opacity-50">
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-md disabled:opacity-50">
            ‹
          </button>
          <span className="text-md text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-md disabled:opacity-50">
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-md disabled:opacity-50">
            »
          </button>
        </div>
      )}

      {showPaymentModal && (
        <SupplierPaymentBulkModal
          supplierId={supplierId}
          supplierDebt={supplierDebt}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showExportDebtModal && (
        <ExportDebtModal
          isExporting={exportingDebt}
          onClose={() => setShowExportDebtModal(false)}
          onConfirm={handleExportDebt}
        />
      )}
    </div>
  );
}
