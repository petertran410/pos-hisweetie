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

  // Sidebar gửi full filters object (giống khach-hang/page.tsx)
  const handleSidebarFiltersChange = useCallback(
    (newFilters: SupplierFilters) => {
      setFilters(newFilters);
    },
    []
  );

  // Table gửi partial updates (pagination, search)
  const handleTableFiltersChange = useCallback(
    (partial: Partial<SupplierFilters>) => {
      setFilters((prev) => ({ ...prev, ...partial }));
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
        <SuppliersTable
          filters={filters}
          onFiltersChange={handleTableFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
