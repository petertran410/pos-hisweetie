"use client";

import { useCallback, useState } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  loadWarehouseCashFilters,
  WarehouseCashSidebar,
} from "@/components/warehouse-cash/WarehouseCashSidebar";
import { WarehouseCashTable } from "@/components/warehouse-cash/WarehouseCashTable";
import type { WarehouseReceiptQuery } from "@/lib/api/internal-finance";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";
import { useBranchStore } from "@/lib/store/branch";

const WAREHOUSE_IDS = [6, 1];

function WarehouseCashScreen() {
  const isMobile = useIsMobile(768);
  const { selectedBranch } = useBranchStore();
  const headerBranchId =
    selectedBranch && WAREHOUSE_IDS.includes(selectedBranch.id)
      ? selectedBranch.id
      : null;
  const [filters, setFilters] = useState<WarehouseReceiptQuery>(() =>
    loadWarehouseCashFilters(headerBranchId),
  );
  const updateFilters = useCallback((patch: Partial<WarehouseReceiptQuery>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
      limit: current.limit || 20,
    }));
  }, []);

  return (
    <div
      className={`flex h-full min-h-0 border-t ${
        isMobile ? "flex-col overflow-auto" : "overflow-hidden"
      }`}
      style={{ borderColor: "var(--dt-border)" }}>
      <WarehouseCashSidebar filters={filters} onChange={updateFilters} />
      <WarehouseCashTable filters={filters} onFiltersChange={updateFilters} />
    </div>
  );
}

export default function TienMatKhoPage() {
  const mounted = useIsClient();

  return (
    <PagePermissionGuard resource="warehouse_cash" action="view">
      {!mounted ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand" />
        </div>
      ) : (
        <WarehouseCashScreen />
      )}
    </PagePermissionGuard>
  );
}
