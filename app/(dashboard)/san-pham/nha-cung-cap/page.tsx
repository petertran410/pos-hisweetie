"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SuppliersSidebar } from "@/components/suppliers/SuppliersSidebar";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { SupplierFilters } from "@/lib/types/supplier";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<SupplierFilters>(() =>
    codeParam
      ? {
          code: codeParam,
          pageSize: 15,
          currentItem: 0,
          orderBy: "createdAt",
          orderDirection: "desc",
          includeSupplierGroup: true,
        }
      : {
          pageSize: 15,
          currentItem: 0,
          orderBy: "createdAt",
          orderDirection: "desc",
          isActive: true,
          includeSupplierGroup: true,
        }
  );

  const handleSidebarFiltersChange = useCallback(
    (newFilters: SupplierFilters) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { code: codeParam } : {}),
      });
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="suppliers" action="view">
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <SuppliersSidebar
          filters={filters}
          onFiltersChange={handleSidebarFiltersChange}
        />
        <SuppliersTable filters={filters} />
      </div>
    </PagePermissionGuard>
  );
}
