"use client";

import { useState } from "react";
import { SuppliersSidebar } from "@/components/suppliers/SuppliersSidebar";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { SupplierFilters } from "@/lib/types/supplier";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function SuppliersPage() {
  const [filters, setFilters] = useState<SupplierFilters>({
    pageSize: 15,
    currentItem: 0,
    orderBy: "createdAt",
    orderDirection: "desc",
    isActive: true,
    includeSupplierGroup: true,
  });

  return (
    <PagePermissionGuard resource="suppliers" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <SuppliersSidebar filters={filters} setFilters={setFilters} />
        <SuppliersTable filters={filters} onFiltersChange={setFilters} />
      </div>
    </PagePermissionGuard>
  );
}
