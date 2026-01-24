"use client";

import { useState } from "react";
import { PurchaseOrderSidebar } from "@/components/purchase-orders/PurchaseOrderSidebar";
import { PurchaseOrdersTable } from "@/components/purchase-orders/PurchaseOrdersTable";
import type { PurchaseOrderFilters } from "@/lib/types/purchase-order";

export default function PurchaseOrdersPage() {
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    pageSize: 15,
    currentItem: 0,
  });

  return (
    <div className="flex h-full border-t bg-gray-50">
      <PurchaseOrderSidebar filters={filters} setFilters={setFilters} />
      <PurchaseOrdersTable filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
