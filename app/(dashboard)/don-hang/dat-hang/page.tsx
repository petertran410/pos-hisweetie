"use client";

import { useState } from "react";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersSidebar } from "@/components/orders/OrdersSidebar";
import type { Order } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function DatHangPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({});

  const handleCreateClick = () => {
    router.push("/ban-hang?type=order");
  };

  const handleEditClick = (order: Order) => {};

  return (
    <PagePermissionGuard resource="orders" action="view">
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <OrdersSidebar filters={filters} onFiltersChange={setFilters} />
        <OrdersTable
          filters={filters}
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
        />
      </div>
    </PagePermissionGuard>
  );
}
