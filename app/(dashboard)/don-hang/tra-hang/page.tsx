"use client";

import { useState } from "react";
import { ReturnOrdersTable } from "@/components/return-orders/ReturnOrdersTable";
import { ReturnOrdersSidebar } from "@/components/return-orders/ReturnOrdersSidebar";
import { CreateReturnOrderModal } from "@/components/return-orders/CreateReturnOrderModal";
import { ConfirmStockModal } from "@/components/return-orders/ConfirmStockModal";
import { ConfirmRefundModal } from "@/components/return-orders/ConfirmRefundModal";
import {
  useCreateReturnOrder,
  useConfirmStockReceived,
  useConfirmRefund,
  useCancelReturnOrder,
} from "@/lib/hooks/useReturnOrders";
import type { ReturnOrder } from "@/lib/types/return-order";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

type ModalType = "create" | "confirm-stock" | "confirm-refund" | null;

export default function TraHangPage() {
  const [filters, setFilters] = useState({});
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedReturnOrderId, setSelectedReturnOrderId] = useState<
    number | null
  >(null);

  const createReturnOrder = useCreateReturnOrder();
  const confirmStock = useConfirmStockReceived();
  const confirmRefund = useConfirmRefund();
  const cancelReturnOrder = useCancelReturnOrder();

  const handleCreateClick = () => {
    setModalType("create");
  };

  const handleViewClick = (item: ReturnOrder) => {
    if (item.status === 1) {
      setSelectedReturnOrderId(item.id);
      setModalType("confirm-stock");
    } else if (item.status === 2) {
      setSelectedReturnOrderId(item.id);
      setModalType("confirm-refund");
    }
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      await createReturnOrder.mutateAsync(data);
      setModalType(null);
    } catch (error) {
      // error handled by hook
    }
  };

  const handleConfirmStockSubmit = async (data: any) => {
    if (!selectedReturnOrderId) return;
    try {
      await confirmStock.mutateAsync({
        id: selectedReturnOrderId,
        data,
      });
      setModalType(null);
      setSelectedReturnOrderId(null);
    } catch (error) {
      // error handled by hook
    }
  };

  const handleConfirmRefundSubmit = async (data: any) => {
    if (!selectedReturnOrderId) return;
    try {
      await confirmRefund.mutateAsync({
        id: selectedReturnOrderId,
        data,
      });
      setModalType(null);
      setSelectedReturnOrderId(null);
    } catch (error) {
      // error handled by hook
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedReturnOrderId(null);
  };

  return (
    <PagePermissionGuard resource="return_orders" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <ReturnOrdersSidebar onFiltersChange={setFilters} />
        <ReturnOrdersTable
          filters={filters}
          onCreateClick={handleCreateClick}
          onViewClick={handleViewClick}
        />

        {modalType === "create" && (
          <CreateReturnOrderModal
            onClose={handleCloseModal}
            onSubmit={handleCreateSubmit}
          />
        )}

        {modalType === "confirm-stock" && selectedReturnOrderId && (
          <ConfirmStockModal
            returnOrderId={selectedReturnOrderId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmStockSubmit}
          />
        )}

        {modalType === "confirm-refund" && selectedReturnOrderId && (
          <ConfirmRefundModal
            returnOrderId={selectedReturnOrderId}
            onClose={handleCloseModal}
            onSubmit={handleConfirmRefundSubmit}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
