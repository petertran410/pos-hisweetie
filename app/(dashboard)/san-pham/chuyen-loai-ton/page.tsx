"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { StockConditionTransfersTable } from "@/components/stock-condition-transfers/StockConditionTransfersTable";
import { StockConditionTransfersSidebar } from "@/components/stock-condition-transfers/StockConditionTransfersSidebar";
import { usePermission } from "@/lib/hooks/usePermissions";

export default function StockConditionTransferPage() {
  const canViewPage = usePermission(
    "stock_condition_transfers",
    "view"
  );

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
    canViewPage ? (
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <StockConditionTransfersSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <StockConditionTransfersTable filters={filters} />
      </div>
    ) : null
  );
}
