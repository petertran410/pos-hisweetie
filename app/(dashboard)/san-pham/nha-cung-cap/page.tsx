"use client";

import { useState, useCallback } from "react";
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

  const handleSidebarFiltersChange = useCallback(
    (newFilters: SupplierFilters) => {
      setFilters(newFilters);
    },
    []
  );

  return (
    <PagePermissionGuard resource="suppliers" action="view">
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <SuppliersSidebar
          filters={filters}
          onFiltersChange={handleSidebarFiltersChange}
        />
        <SuppliersTable filters={filters} /> {/* ← xóa onFiltersChange */}
      </div>
    </PagePermissionGuard>
  );
}
