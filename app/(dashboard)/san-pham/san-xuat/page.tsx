"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ProductionTable } from "@/components/productions/ProductionTable";
import { ProductionSidebar } from "@/components/productions/ProductionSidebar";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function ProductionsPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
      if (codeParam) return;
      setFilters(newFilters);
    },
    [codeParam]
  );

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
