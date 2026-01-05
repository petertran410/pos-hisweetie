"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { CustomerPaymentModal } from "./CustomerPaymentModal";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
}: CustomerDebtsTabProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cashflows", "customer", customerId, sortOrder],
    queryFn: () =>
      cashflowsApi.getCashFlows({
        partnerId: customerId,
        partnerType: "C",
        limit: 100,
        sortOrder,
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const cashflows = data?.data || [];

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Nợ hiện tại:{" "}
            <span className="font-semibold text-red-600">
              {formatCurrency(customerDebt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="border rounded px-3 py-2 text-sm">
              <option value="desc">Tất cả giao dịch</option>
              <option value="asc">Tất cả giao dịch (cũ nhất)</option>
            </select>
            {customerDebt > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                💵 Thanh toán
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Mã phiếu
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Loại
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Giá trị
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Dư nợ khách hàng
                </th>
              </tr>
            </thead>
            <tbody>
              {cashflows.map((cf, index) => {
                const currentDebt =
                  index === 0
                    ? customerDebt
                    : cashflows[index - 1].isReceipt
                    ? Number(cashflows[index - 1].amount)
                    : -Number(cashflows[index - 1].amount);

                const cashflowType = cf.isReceipt ? "Thanh toán" : "Bán hàng";

                return (
                  <tr key={cf.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {cf.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(cf.transDate).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-sm">{cashflowType}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={
                          cf.isReceipt ? "text-green-600" : "text-red-600"
                        }>
                        {cf.isReceipt ? "-" : ""}
                        {formatCurrency(cf.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(currentDebt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && (
        <CustomerPaymentModal
          customerId={customerId}
          customerDebt={customerDebt}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}
