"use client";

import { useState, useCallback } from "react";
import { StockAuditsTable } from "@/components/stock-audits/StockAuditsTable";
import { StockAuditsSidebar } from "@/components/stock-audits/StockAuditsSidebar";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function StockAuditPage() {
  const [filters, setFilters] = useState<any>({});

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  return (
    <PermissionGate resource="stock_audits" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <StockAuditsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <StockAuditsTable filters={filters} />
      </div>
    </PermissionGate>
  );
}
