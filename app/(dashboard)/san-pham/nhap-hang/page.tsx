"use client";

import { useCallback, useState } from "react";
import { PurchaseOrderSidebar } from "@/components/purchase-orders/PurchaseOrderSidebar";
import { PurchaseOrdersTable } from "@/components/purchase-orders/PurchaseOrdersTable";
import type { PurchaseOrderFilters } from "@/lib/types/purchase-order";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function PurchaseOrdersPage() {
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    pageSize: 15,
    currentItem: 0,
  });

  const handleFiltersChange = useCallback(
    (newFilters: Partial<PurchaseOrderFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  return (
    <PagePermissionGuard resource="purchase_orders" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <PurchaseOrderSidebar
          filters={filters}
          setFilters={handleFiltersChange}
        />
        <PurchaseOrdersTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
