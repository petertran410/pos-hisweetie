"use client";

import { useState, useCallback } from "react";
import { ProductionTable } from "@/components/productions/ProductionTable";
import { ProductionSidebar } from "@/components/productions/ProductionSidebar";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function ProductionsPage() {
  const [filters, setFilters] = useState<any>({});

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  return (
    <PagePermissionGuard resource="productions" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <ProductionSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <ProductionTable filters={filters} />
      </div>
    </PagePermissionGuard>
  );
}
