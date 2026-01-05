"use client";

import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CustomerInvoicesTabProps {
  customerId: number;
}

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", "customer", customerId],
    queryFn: () =>
      invoicesApi.getInvoices({
        customerIds: [customerId],
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

  const invoices = data?.data || [];

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có lịch sử bán hàng
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã hóa đơn
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Người bán
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Chi nhánh
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Tổng cộng
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <a
                  href={`/invoices/${invoice.id}`}
                  className="text-blue-600 hover:underline">
                  {invoice.code}
                </a>
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(invoice.purchaseDate).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-sm">
                {invoice.soldBy?.name || "admin"}
              </td>
              <td className="px-4 py-3 text-sm">
                {invoice.branch?.name || "-"}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(invoice.grandTotal)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    invoice.status === 4
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                  {invoice.statusValue || "Đang xử lý"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
            Xuất file
          </span>
        </button>
      </div>
    </div>
  );
}
