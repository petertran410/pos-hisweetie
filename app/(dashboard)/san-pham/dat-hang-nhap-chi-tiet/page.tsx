"use client";

import { useCallback, useState } from "react";
import { OrderSupplierDetailSidebar } from "@/components/order-suppliers/OrderSupplierDetailSidebar";
import { OrderSupplierDetailItemsTable } from "@/components/order-suppliers/OrderSupplierDetailItemsTable";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function OrderSupplierDetailPage() {
  const [filters, setFilters] = useState<OrderSupplierFilters>({
    pageSize: 20,
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
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <OrderSupplierDetailSidebar
          filters={filters}
          setFilters={handleFiltersChange}
        />
        <OrderSupplierDetailItemsTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
