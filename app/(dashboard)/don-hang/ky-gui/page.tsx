"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConsignmentSidebar } from "@/components/consignments/ConsignmentSidebar";
import { ConsignmentsTable } from "@/components/consignments/ConsignmentsTable";
import type { ConsignmentFilters } from "@/lib/types/consignment";
import { CONSIGNMENT_STATUS } from "@/lib/types/consignment";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";
import { useBranchStore } from "@/lib/store/branch";

// Trạng thái mặc định: Phiếu tạm + Đã xác nhận + Ký gửi một phần.
const DEFAULT_STATUS = [
  CONSIGNMENT_STATUS.PENDING,
  CONSIGNMENT_STATUS.CONFIRMED,
  CONSIGNMENT_STATUS.PARTIALLY_INVOICED,
];

export default function ConsignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");
  const { selectedBranch } = useBranchStore();

  const [filters, setFilters] = useState<ConsignmentFilters>(() => ({
    ...(codeParam ? { search: codeParam } : { pageSize: 15, currentItem: 0 }),
    branchIds: selectedBranch?.id ? [selectedBranch.id] : undefined,
    status: DEFAULT_STATUS,
  }));

  // Lọc theo chi nhánh đang chọn ở header. Sync khi user đổi chi nhánh —
  // bỏ qua lần mount đầu (đã seed trong initializer).
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const currentBranchId = selectedBranch?.id ?? null;
    if (currentBranchId !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = currentBranchId;
      setFilters((prev) => ({
        ...prev,
        branchIds: currentBranchId ? [currentBranchId] : undefined,
      }));
    }
  }, [selectedBranch?.id]);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<ConsignmentFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      }));
    },
    [codeParam]
  );

  usePendingPrint();

  const handleCreateClick = () => {
    router.push("/ban-hang?type=consignment&from=ky-gui");
  };

  return (
    <PagePermissionGuard resource="consignments" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <ConsignmentSidebar filters={filters} setFilters={handleFiltersChange} />
        <ConsignmentsTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateClick={handleCreateClick}
        />
      </div>
    </PagePermissionGuard>
  );
}
