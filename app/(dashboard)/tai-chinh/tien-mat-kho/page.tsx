"use client";

import { MobileFilterDrawer } from "@/components/internal-finance/mobile/FinanceMobileShell";
import { usePageSize } from "@/lib/hooks/usePageSize";
import { useCallback, useState } from "react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
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
  const [pageSize, setPageSize] = usePageSize("warehouseCashPageSize", 20);
  const [filters, setFilters] = useState<WarehouseReceiptQuery>(() => ({
    ...loadWarehouseCashFilters(headerBranchId),
    limit: pageSize,
  }));
  const updateFilters = useCallback(
    (patch: Partial<WarehouseReceiptQuery>) => {
      if (patch.limit) setPageSize(patch.limit);
      setFilters((current) => ({
        ...current,
        ...patch,
        page: patch.page ?? 1,
        // Đổi số dòng/trang phải lấy giá trị mới (trước đây bị giữ 20).
        limit: patch.limit || current.limit || pageSize,
      }));
    },
    [pageSize, setPageSize],
  );

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    filters.branchIds?.length,
    filters.receiptStatus,
    filters.confirmStatus,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;

  return (
    <div
      className={`flex h-full min-h-0 overflow-hidden border-t ${
        isMobile ? "flex-col" : ""
      }`}
      style={{ borderColor: "var(--dt-border)" }}>
      {isMobile ? (
        <MobileFilterDrawer
          open={showFilters}
          onClose={() => setShowFilters(false)}>
          <WarehouseCashSidebar filters={filters} onChange={updateFilters} />
        </MobileFilterDrawer>
      ) : (
        <WarehouseCashSidebar filters={filters} onChange={updateFilters} />
      )}
      <WarehouseCashTable
        filters={filters}
        onFiltersChange={updateFilters}
        isMobile={isMobile}
        activeFilterCount={activeFilterCount}
        onOpenFilter={() => setShowFilters(true)}
      />
    </div>
  );
}

export default function TienMatKhoPage() {
  const mounted = useIsClient();

  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_cash", action: "view" }]}>
      {!mounted ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand" />
        </div>
      ) : (
        <WarehouseCashScreen />
      )}
    </FinancePageGuard>
  );
}
