"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { StockAuditsTable } from "@/components/stock-audits/StockAuditsTable";
import { StockAuditsSidebar } from "@/components/stock-audits/StockAuditsSidebar";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function StockAuditPage() {
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
    <PermissionGate resource="stock_audits" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <StockAuditsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <StockAuditsTable filters={filters} />
      </div>
    </PermissionGate>
  );
}
