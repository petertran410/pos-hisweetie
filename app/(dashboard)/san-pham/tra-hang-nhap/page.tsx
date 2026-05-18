"use client";

import { useCallback, useState } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { SupplierReturnsSidebar } from "@/components/supplier-returns/SupplierReturnsSidebar";
import { SupplierReturnsTable } from "@/components/supplier-returns/SupplierReturnsTable";
import { CreateSupplierReturnModal } from "@/components/supplier-returns/CreateSupplierReturnModal";
import { ConfirmExportModal } from "@/components/supplier-returns/ConfirmExportModal";
import { ConfirmRefundModal } from "@/components/supplier-returns/ConfirmRefundModal";
import {
  useCreateSupplierReturn,
  useConfirmExport,
  useConfirmSupplierRefund,
} from "@/lib/hooks/useSupplierReturns";
import type { SupplierReturn } from "@/lib/types/supplier-return";

type ModalType = "create" | "confirm-export" | "confirm-refund" | null;

export default function TraHangNhapPage() {
  const [filters, setFilters] = useState<any>({});
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const createMutation = useCreateSupplierReturn();
  const confirmExportMutation = useConfirmExport();
  const confirmRefundMutation = useConfirmSupplierRefund();

  const handleFiltersChange = useCallback((f: any) => setFilters(f), []);

  const handleViewClick = (item: SupplierReturn) => {
    setSelectedId(item.id);
    if (item.status === 1 || item.status === 5) {
      setModalType("confirm-export");
    } else if (item.status === 2) {
      setModalType("confirm-refund");
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedId(null);
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setModalType(null);
    } catch {}
  };

  const handleConfirmExportSubmit = async (data: any) => {
    if (!selectedId) return;
    try {
      await confirmExportMutation.mutateAsync({ id: selectedId, data });
      handleCloseModal();
    } catch {}
  };

  const handleConfirmRefundSubmit = async (data: any) => {
    if (!selectedId) return;
    try {
      await confirmRefundMutation.mutateAsync({ id: selectedId, data });
      handleCloseModal();
    } catch {}
  };

  return (
    <PagePermissionGuard resource="supplier_returns" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <SupplierReturnsSidebar onFiltersChange={handleFiltersChange} />
        <SupplierReturnsTable
          filters={filters}
          onCreateClick={() => setModalType("create")}
          onViewClick={handleViewClick}
        />

        {modalType === "create" && (
          <CreateSupplierReturnModal
            onClose={handleCloseModal}
            onSubmit={handleCreateSubmit}
          />
        )}

        {modalType === "confirm-export" && selectedId && (
          <ConfirmExportModal
            supplierReturnId={selectedId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmExportSubmit}
          />
        )}

        {modalType === "confirm-refund" && selectedId && (
          <ConfirmRefundModal
            supplierReturnId={selectedId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmRefundSubmit}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
