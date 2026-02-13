"use client";

import { useQuery } from "@tanstack/react-query";
import { packingSlipsApi } from "@/lib/api/packing-slips";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface InvoicePackingSlipsTabProps {
  invoiceId: number;
}

export function InvoicePackingSlipsTab({
  invoiceId,
}: InvoicePackingSlipsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["packing-slips", "invoice", invoiceId],
    queryFn: () =>
      packingSlipsApi.getPackingSlips({
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

  const packingSlips = data?.data || [];

  if (packingSlips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">Chưa có báo đơn nào</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã báo đơn
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Chi nhánh
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Số kiện
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thanh toán
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Phí gửi bến
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Phí Grab
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Cước gửi hàng
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
          </tr>
        </thead>
        <tbody>
          {packingSlips.map((slip: any) => (
            <tr key={slip.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="text-blue-600 font-medium">{slip.code}</span>
              </td>
              <td className="px-4 py-3 text-sm">{slip.branch?.name || "-"}</td>
              <td className="px-4 py-3 text-center text-sm">
                {slip.numberOfPackages}
              </td>
              <td className="px-4 py-3 text-sm">
                {slip.paymentMethod === "cash"
                  ? `Tiền mặt - ${formatCurrency(slip.cashAmount)}`
                  : "Chuyển khoản"}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                {slip.hasFeeGuiBen ? formatCurrency(slip.feeGuiBen) : "-"}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                {slip.hasFeeGrab ? formatCurrency(slip.feeGrab) : "-"}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                {slip.hasCuocGuiHang ? formatCurrency(slip.cuocGuiHang) : "-"}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(slip.createdAt).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
