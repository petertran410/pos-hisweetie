"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { InventoryPromoChecksTable } from "@/components/inventory-promo-checks/InventoryPromoChecksTable";
import { InventoryPromoChecksSidebar } from "@/components/inventory-promo-checks/InventoryPromoChecksSidebar";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function InventoryPromoCheckPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      if (codeParam) return;
      setFilters(newFilters);
    },
    [codeParam]
  );

  return (
    <PermissionGate resource="inventory_promo_checks" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <InventoryPromoChecksSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <InventoryPromoChecksTable filters={filters} />
      </div>
    </PermissionGate>
  );
}
