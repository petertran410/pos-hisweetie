"use client";

import { useCallback, useState } from "react";
import { OrderSupplierSidebar } from "@/components/order-suppliers/OrderSupplierSidebar";
import { OrderSuppliersTable } from "@/components/order-suppliers/OrderSuppliersTable";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function OrderSuppliersPage() {
  const [filters, setFilters] = useState<OrderSupplierFilters>({
    pageSize: 15,
    currentItem: 0,
  });

  const handleFiltersChange = useCallback(
    (newFilters: Partial<OrderSupplierFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  return (
    <PagePermissionGuard resource="order_suppliers" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <OrderSupplierSidebar
          filters={filters}
          setFilters={handleFiltersChange}
        />
        <OrderSuppliersTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
