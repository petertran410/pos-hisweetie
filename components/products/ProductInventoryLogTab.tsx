"use client";

import { useProductInventoryLogs } from "@/lib/hooks/useProducts";
import { Loader2 } from "lucide-react";

interface Props {
  productId: number;
  branchId?: number;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Nhập hàng",
  SALE: "Bán hàng",
  TRANSFER_OUT: "Chuyển hàng",
  TRANSFER_IN: "Chuyển hàng",
  PRODUCTION_OUT: "Sản xuất",
  PRODUCTION_IN: "Sản xuất",
  DESTRUCTION: "Xuất hủy",
  RETURN: "Trả hàng",
};

const formatMoney = (v: number | null | undefined) => {
  if (!v && v !== 0) return "-";
  return new Intl.NumberFormat("en-US").format(v);
};

const formatDateTime = (s: string) => {
  return new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ProductInventoryLogTab({ productId, branchId }: Props) {
  const { data: logs, isLoading } = useProductInventoryLogs(
    productId,
    branchId
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Chưa có dữ liệu thẻ kho
      </div>
    );
  }

  return (
    <div className="border rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Chứng từ
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Thời gian
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Loại giao dịch
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Đối tác
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Giá GD
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Giá vốn
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Số lượng
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className={`font-medium text-blue-600`}>
                  {log.refCode || "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatDateTime(log.createdAt)}
              </td>
              <td className="px-4 py-3">
                {TRANSACTION_TYPE_LABELS[log.transactionType] ||
                  log.transactionType}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {log.partnerName || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                {log.transactionPrice != null
                  ? formatMoney(log.transactionPrice)
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(log.costPrice)}
              </td>
              <td
                className={`px-4 py-3 text-right font-medium ${Number(log.quantity) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(log.quantity) > 0 ? "+" : ""}
                {Number(log.quantity).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
