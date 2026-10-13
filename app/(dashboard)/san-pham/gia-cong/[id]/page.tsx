"use client";

import { useParams } from "next/navigation";
import { SubcontractOrderForm } from "@/components/subcontract-orders/SubcontractOrderForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useSubcontractOrder } from "@/lib/hooks/useSubcontractOrders";

export default function EditSubcontractOrderPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: order, isLoading } = useSubcontractOrder(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Không tìm thấy lệnh gia công</div>
      </div>
    );
  }

  return (
    <PagePermissionGuard resource="subcontract_orders" action="update">
      <SubcontractOrderForm order={order} />
    </PagePermissionGuard>
  );
}
