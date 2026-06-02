"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { InventoryChecksTable } from "@/components/inventory-checks/InventoryChecksTable";
import { InventoryChecksSidebar } from "@/components/inventory-checks/InventoryChecksSidebar";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function InventoryCheckPage() {
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
    <PermissionGate resource="inventory_checks" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <InventoryChecksSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <InventoryChecksTable filters={filters} />
      </div>
    </PermissionGate>
  );
}
