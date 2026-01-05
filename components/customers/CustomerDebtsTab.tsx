"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CustomerDebtsTabProps {
  customerId: number;
  customerDebt: number;
}

export function CustomerDebtsTab({
  customerId,
  customerDebt,
}: CustomerDebtsTabProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
    <div>
      <div className="mb-4 flex items-center justify-end">
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="border rounded px-3 py-2 text-sm">
          <option value="desc">Tất cả giao dịch</option>
          <option value="asc">Tất cả giao dịch (cũ nhất)</option>
        </select>
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
              <th className="px-4 py-3 text-left text-sm font-medium">Loại</th>
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
                  : customerDebt -
                    cashflows
                      .slice(0, index)
                      .reduce((sum, c) => sum + Number(c.amount), 0);

              return (
                <tr key={cf.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a
                      href={`/cashflows/${cf.id}`}
                      className="text-blue-600 hover:underline">
                      {cf.code}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(cf.transDate).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {cf.isReceipt ? "Thanh toán" : "Bán hàng"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={
                        cf.isReceipt ? "text-green-600" : "text-blue-600"
                      }>
                      {cf.isReceipt ? "-" : "+"}
                      {formatCurrency(cf.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatCurrency(currentDebt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button className="px-4 py-2 border rounded hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            Xuất file công nợ
          </span>
        </button>
        <button className="px-4 py-2 border rounded hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            Xuất file
          </span>
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Thanh toán
          </span>
        </button>
        <button className="px-4 py-2 border rounded hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Điều chỉnh
          </span>
        </button>
        <button className="px-4 py-2 border rounded hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Chiết khấu thanh toán
          </span>
        </button>
        <button className="px-4 py-2 border rounded hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Tạo QR
          </span>
        </button>
      </div>
    </div>
  );
}
