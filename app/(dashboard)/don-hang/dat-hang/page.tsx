"use client";

import { useState } from "react";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersSidebar } from "@/components/orders/OrdersSidebar";
import type { Order } from "@/lib/types/order";

export default function DatHangPage() {
  const [filters, setFilters] = useState({});

  const handleCreateClick = () => {
    alert("Tạo đơn đặt hàng mới - Form sẽ được triển khai sau");
  };

  const handleEditClick = (order: Order) => {
    alert(`Sửa đơn hàng ${order.code} - Form sẽ được triển khai sau`);
  };

  return (
    <div className="flex h-full">
      <OrdersSidebar filters={filters} onFiltersChange={setFilters} />
      <OrdersTable
        filters={filters}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
      />
    </div>
  );
}
