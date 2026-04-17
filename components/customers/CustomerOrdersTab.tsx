"use client";

import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface CustomerOrdersTabProps {
  customerId: number;
}

export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "customer", customerId],
    queryFn: () =>
      ordersApi.getOrders({
        customerId,
        limit: 100,
      }),
  });

  const [page, setPage] = useState(1);
  const limit = 5;

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
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã đặt hàng
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Người bán
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Chi nhánh xử lý
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
          {paginatedOrders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <a
                  href={`/orders/${order.id}`}
                  className="text-blue-600 hover:underline">
                  {order.code}
                </a>
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(order.orderDate).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-sm">
                {order.soldBy?.name || "admin"}
              </td>
              <td className="px-4 py-3 text-sm">{order.branch?.name || "-"}</td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(order.grandTotal)}
              </td>
              <td className="px-4 py-3 text-center">
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
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Tổng: {orders.length} đơn hàng
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
              Trước
            </button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
