"use client";

import { useState } from "react";
import { OrderSupplierSidebar } from "@/components/order-suppliers/OrderSupplierSidebar";
import { OrderSuppliersTable } from "@/components/order-suppliers/OrderSuppliersTable";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";

export default function OrderSuppliersPage() {
  const [filters, setFilters] = useState<OrderSupplierFilters>({
    pageSize: 15,
    currentItem: 0,
  });

  return (
    <div className="flex h-full border-t bg-gray-50">
      <OrderSupplierSidebar filters={filters} setFilters={setFilters} />
      <OrderSuppliersTable filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
