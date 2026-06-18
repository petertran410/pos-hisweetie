"use client";

import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DocumentPreviewModal } from "../shared/DocumentPreviewModal";

interface CustomerOrdersTabProps {
  customerId: number;
}

export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "customer", customerId],
    queryFn: () =>
      ordersApi.getOrders({
        customerId,
        limit: 1000,
      }),
  });

  const [page, setPage] = useState(1);
  const limit = 5;
  const [preview, setPreview] = useState<{
    id: number;
    code: string;
  } | null>(null);

  const orders = data?.data || [];

  const totalPages = Math.ceil(orders.length / limit);
  const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có lịch sử đặt hàng
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Mã đặt hàng
            </th>
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Thời gian
            </th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Người bán
            </th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Chi nhánh xử lý
            </th>
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-right text-xs lg:text-sm font-medium">
              Tổng cộng
            </th>
            <th className="px-2 py-2 hidden lg:block lg:px-4 lg:py-3 text-center text-xs lg:text-sm font-medium">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview({ id: order.id, code: order.code });
                  }}
                  className="text-brand hover:underline">
                  {order.code}
                </button>
              </td>
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {new Date(order.orderDate).toLocaleString("vi-VN")}
              </td>
              <td className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {order.soldBy?.name || "admin"}
              </td>
              <td className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {order.branch?.name || "-"}
              </td>
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm text-right">
                {formatCurrency(order.grandTotal)}
              </td>
              <td className="px-2 py-2 hidden lg:block lg:px-4 lg:py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 3
                      ? "bg-green-100 text-green-800"
                      : order.status === 4
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}>
                  {order.statusValue}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 lg:px-4 lg:py-3 border-t">
          <div className="text-xs lg:text-sm text-gray-600">
            Tổng: {orders.length} đơn hàng
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 lg:px-3 border rounded text-xs lg:text-sm disabled:opacity-50 hover:bg-gray-50">
              Trước
            </button>
            <span className="text-xs lg:text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 lg:px-3 border rounded text-xs lg:text-sm disabled:opacity-50 hover:bg-gray-50">
              Sau
            </button>
          </div>
        </div>
      )}

      {preview && (
        <DocumentPreviewModal
          type="order"
          id={preview.id}
          code={preview.code}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
