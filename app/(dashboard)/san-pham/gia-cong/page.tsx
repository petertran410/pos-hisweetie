"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SubcontractOrderSidebar } from "@/components/subcontract-orders/SubcontractOrderSidebar";
import { SubcontractOrdersTable } from "@/components/subcontract-orders/SubcontractOrdersTable";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import type { SubcontractOrderFilters } from "@/lib/types/subcontract-order";

export default function SubcontractOrdersPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<SubcontractOrderFilters>(() =>
    codeParam ? { search: codeParam } : {},
  );

  const handleFiltersChange = useCallback(
    (newFilters: SubcontractOrderFilters) => {
      // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
      if (codeParam) return;
      setFilters(newFilters);
    },
    [codeParam],
  );

  return (
    <PagePermissionGuard resource="subcontract_orders" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <SubcontractOrderSidebar onFiltersChange={handleFiltersChange} />
        <SubcontractOrdersTable filters={filters} />
      </div>
    </PagePermissionGuard>
  );
}
