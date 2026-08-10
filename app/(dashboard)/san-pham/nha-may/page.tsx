"use client";

import { useState, useCallback } from "react";
import { FactoriesSidebar } from "@/components/factories/FactoriesSidebar";
import { FactoriesTable } from "@/components/factories/FactoriesTable";
import { FactoryQueryParams } from "@/lib/api/factories";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function FactoriesPage() {
  const [filters, setFilters] = useState<FactoryQueryParams & { page: number; limit: number }>({ page: 1, limit: 15, orderBy: "name", orderDirection: "asc" });
  const handleFiltersChange = useCallback((newFilters: FactoryQueryParams & { page: number; limit: number }) => setFilters(newFilters), []);
  return (
    <PagePermissionGuard resource="factories" action="view">
      <div className="flex h-full border-t w-screen" style={{ borderColor: "var(--dt-border)" }}>
        <FactoriesSidebar filters={filters} onFiltersChange={handleFiltersChange} />
        <FactoriesTable filters={filters} onPageChange={(page) => setFilters({ ...filters, page })} />
      </div>
    </PagePermissionGuard>
  );
}
