"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { StockConditionTransfersTable } from "@/components/stock-condition-transfers/StockConditionTransfersTable";
import { StockConditionTransfersSidebar } from "@/components/stock-condition-transfers/StockConditionTransfersSidebar";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function StockConditionTransferPage() {
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
    <PermissionGate resource="stock_condition_transfers" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <StockConditionTransfersSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <StockConditionTransfersTable filters={filters} />
      </div>
    </PermissionGate>
  );
}
