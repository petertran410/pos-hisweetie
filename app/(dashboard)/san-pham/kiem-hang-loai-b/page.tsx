"use client";

import { useState, useCallback } from "react";
import { InventoryChecksTable } from "@/components/inventory-checks/InventoryChecksTable";
import { InventoryChecksSidebar } from "@/components/inventory-checks/InventoryChecksSidebar";
import { Can } from "@/components/permissions/Can";

export default function InventoryCheckPage() {
  const [filters, setFilters] = useState<any>({});

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  return (
    <Can resource="inventory_checks" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <InventoryChecksSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <InventoryChecksTable filters={filters} />
      </div>
    </Can>
  );
}
