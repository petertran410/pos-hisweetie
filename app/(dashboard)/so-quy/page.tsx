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
      if (codeParam) {
        // Khi đang filter theo code: bỏ qua toàn bộ sidebar filters
        // để queryKey không thay đổi, tránh React Query refetch gây mất data
        setFilters({ code: codeParam });
        return;
      }
      setFilters(newFilters);
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
