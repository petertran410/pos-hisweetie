"use client";

import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface InvoicePaymentsTabProps {
  invoiceId: number;
}

export function InvoicePaymentsTab({ invoiceId }: InvoicePaymentsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () => invoicesApi.getInvoicePayments(invoiceId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const payments = data || [];

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có thanh toán nào
      </div>
    );
  }

  const tttuhd = payments.filter((p: any) => p.code.startsWith("TTTUHD"));
  const othersRaw = payments.filter((p: any) => !p.code.startsWith("TTTUHD"));

  const totalTTTUHD = tttuhd.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  const displayRows = [];

  if (totalTTTUHD > 0) {
    displayRows.push({
      code: "(Chuyển tạm ứng)",
      paymentDate: tttuhd[0]?.paymentDate,
      amount: totalTTTUHD,
      paymentMethod: null,
      status: 1,
      isTTTUHD: true,
    });
  }

  const others = othersRaw.map((p: any) => {
    const isFromCustomerPayment = p.cashFlow && !p.cashFlow.code.includes("HD");

    return {
      code: isFromCustomerPayment ? p.cashFlow.code : p.code,
      paymentDate: p.paymentDate,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      status: p.status,
      cashFlow: p.cashFlow,
      isTTTUHD: false,
      isFromCustomerPayment,
    };
  });

  displayRows.push(...others);

  const getMethodText = (method: string) => {
    const methodMap: { [key: string]: string } = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản",
      ewallet: "Ví điện tử",
      card: "Thẻ",
      voucher: "Voucher",
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
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <span
                  className={
                    row.isTTTUHD
                      ? "text-gray-600 italic"
                      : "text-blue-600 hover:underline cursor-pointer"
                  }>
                  {row.code}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(row.paymentDate).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                {formatCurrency(row.amount)}
              </td>
              <td className="px-4 py-3 text-sm">
                {row.paymentMethod ? getMethodText(row.paymentMethod) : "-"}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Đã thanh toán
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
