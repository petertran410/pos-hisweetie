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
  useCancelSupplierReturn,
} from "@/lib/hooks/useSupplierReturns";
import type { SupplierReturn } from "@/lib/types/supplier-return";
import { EditStep1Modal } from "@/components/supplier-returns/EditStep1Modal";
import { SupplierReturnImportModal } from "@/components/supplier-returns/SupplierReturnImportModal";
import { useSearchParams } from "next/navigation";

type ModalType =
  | "create"
  | "confirm-export"
  | "confirm-refund"
  | "edit-step1"
  | "import"
  | null;

export default function TraHangNhapPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");
  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const createMutation = useCreateSupplierReturn();
  const confirmExportMutation = useConfirmExport();
  const confirmRefundMutation = useConfirmSupplierRefund();
  const cancelMutation = useCancelSupplierReturn();

  const handleFiltersChange = useCallback(
    (f: any) => {
      // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
      if (codeParam) return;
      setFilters(f);
    },
    [codeParam]
  );

  const handleViewClick = (item: SupplierReturn) => {
    setSelectedId(item.id);
    if (item.status === 5) {
      setModalType("edit-step1"); // DRAFT → mở modal bước 1 để sửa
    } else if (item.status === 1 || item.status === 6) {
      setModalType("confirm-export"); // REQUEST hoặc STOCK_EXPORT_DRAFT → bước 2
    } else if (item.status === 2) {
      setModalType("confirm-refund"); // STOCK_EXPORTED → bước 3
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

  const handleCancelSubmit = async () => {
    if (!selectedId) return;
    try {
      await cancelMutation.mutateAsync(selectedId);
      handleCloseModal();
    } catch {}
  };

  return (
    <PagePermissionGuard resource="supplier_returns" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <SupplierReturnsSidebar onFiltersChange={handleFiltersChange} />
        <SupplierReturnsTable
          filters={filters}
          onCreateClick={() => setModalType("create")}
          onViewClick={handleViewClick}
          onImportClick={() => setModalType("import")}
        />

        {modalType === "create" && (
          <CreateSupplierReturnModal
            onClose={handleCloseModal}
            onSubmit={handleCreateSubmit}
          />
        )}

        {modalType === "edit-step1" && selectedId && (
          <EditStep1Modal
            supplierReturnId={selectedId}
            onClose={handleCloseModal}
            onSubmit={handleCreateSubmit}
            onCancel={handleCancelSubmit}
          />
        )}

        {modalType === "confirm-export" && selectedId && (
          <ConfirmExportModal
            supplierReturnId={selectedId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmExportSubmit}
            onCancel={handleCancelSubmit}
          />
        )}

        {modalType === "confirm-refund" && selectedId && (
          <ConfirmRefundModal
            supplierReturnId={selectedId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmRefundSubmit}
            onCancel={handleCancelSubmit}
          />
        )}

        {modalType === "import" && (
          <SupplierReturnImportModal onClose={handleCloseModal} />
        )}
      </div>
    </PagePermissionGuard>
  );
}
