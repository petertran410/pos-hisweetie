"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useSupplierDebtTimeline } from "@/lib/hooks/useSuppliers";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { SupplierPaymentBulkModal } from "./SupplierPaymentBulkModal";
import { CodeLink } from "../shared/CodeLink";

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

  const { data, isLoading } = useSupplierDebtTimeline(supplierId);
  const timeline = data?.data || [];
  const totalPages = Math.ceil(timeline.length / limit);
  const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-md text-gray-600">
          Nợ cần trả hiện tại:{" "}
          <span className="font-semibold text-red-600">
            {formatCurrency(supplierDebt)}
          </span>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark">
          💵 Trả tiền NCC
        </button>
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
                          href={`/so-quy?Code=${item.code}`}
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
        </div>
      )}

      {showPaymentModal && (
        <SupplierPaymentBulkModal
          supplierId={supplierId}
          supplierDebt={supplierDebt}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
