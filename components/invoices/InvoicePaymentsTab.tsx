"use client";

import { useQuery } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface InvoicePaymentsTabProps {
  invoiceId: number;
}

export function InvoicePaymentsTab({ invoiceId }: InvoicePaymentsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () =>
      cashflowsApi.getCashFlows({
        invoiceId,
        limit: 100,
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const payments = data?.data || [];

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có phiếu thu/chi nào
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "bg-green-100 text-green-700";
      case 2:
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Đã thanh toán";
      case 2:
        return "Đã hủy";
      default:
        return "Đang xử lý";
    }
  };

  const getMethodText = (method: string) => {
    const methodMap: { [key: string]: string } = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản",
      ewallet: "Ví điện tử",
      card: "Thẻ",
    };
    return methodMap[method] || method;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã phiếu
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">Loại</th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Số tiền
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Phương thức
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="text-blue-600 font-medium">
                  {payment.code}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {payment.isReceipt ? "Phiếu thu" : "Phiếu chi"}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(payment.transDate).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span
                  className={
                    payment.isReceipt ? "text-green-600" : "text-red-600"
                  }>
                  {payment.isReceipt ? "+" : "-"}
                  {formatCurrency(payment.amount)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {getMethodText(payment.method)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    payment.status
                  )}`}>
                  {getStatusText(payment.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {payment.description || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
