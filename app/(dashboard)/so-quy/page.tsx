"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CashFlowsTable } from "@/components/cashflows/CashFlowsTable";
import { CashFlowsSidebar } from "@/components/cashflows/CashFlowsSidebar";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function SoQuyPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { code: codeParam } : {}
  );

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { code: codeParam } : {}),
      });
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="cash_flows" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <CashFlowsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <CashFlowsTable
          filters={filters}
          onCreateReceiptClick={() => {}}
          onCreatePaymentClick={() => {}}
        />
      </div>
    </PagePermissionGuard>
  );
}
