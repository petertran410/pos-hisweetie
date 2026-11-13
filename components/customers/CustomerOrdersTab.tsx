"use client";

import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import {
  DateCell,
  StatusPill,
  TabEmpty,
  TabLoading,
  TabPagination,
  TabTable,
  Td,
  Th,
  Tr,
} from "./CustomerTabUI";
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
  const limit = 9;
  const [preview, setPreview] = useState<{
    id: number;
    code: string;
  } | null>(null);

  const orders = data?.data || [];

  const totalPages = Math.ceil(orders.length / limit);
  const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

  // Kiểm tra đang tải trước — tránh hiện "Chưa có" trong lúc chờ dữ liệu
  if (isLoading) return <TabLoading />;

  if (orders.length === 0) {
    return (
      <TabEmpty
        icon={ShoppingCart}
        title="Chưa có lịch sử đặt hàng"
        description="Các đơn đặt hàng của khách sẽ hiện ở đây."
      />
    );
  }

  return (
    <>
      <TabTable
        footer={
          <TabPagination
            page={page}
            totalPages={totalPages}
            total={orders.length}
            unit="đơn hàng"
            onChange={setPage}
          />
        }>
        <thead>
          <tr>
            <Th>Mã đặt hàng</Th>
            <Th>Thời gian</Th>
            <Th className="hidden md:table-cell">Người bán</Th>
            <Th className="hidden md:table-cell">Chi nhánh xử lý</Th>
            <Th align="right">Tổng cộng</Th>
            <Th align="center" className="hidden md:table-cell">
              Trạng thái
            </Th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <Tr key={order.id}>
              <Td>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview({ id: order.id, code: order.code });
                  }}
                  className="font-medium text-brand hover:underline">
                  {order.code}
                </button>
              </Td>
              <Td>
                <DateCell value={order.orderDate} />
              </Td>
              <Td className="hidden md:table-cell">
                {order.soldBy?.name || "admin"}
              </Td>
              <Td className="hidden md:table-cell">
                {order.branch?.name || "—"}
              </Td>
              <Td
                align="right"
                className="font-medium tabular-nums text-gray-900">
                {formatCurrency(order.grandTotal)}
              </Td>
              <Td align="center" className="hidden md:table-cell">
                <StatusPill
                  colorClass={
                    order.status === 3
                      ? "bg-green-100 text-green-800"
                      : order.status === 4
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }>
                  {order.statusValue}
                </StatusPill>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TabTable>

      {preview && (
        <DocumentPreviewModal
          type="order"
          id={preview.id}
          code={preview.code}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
