"use client";

import { SubcontractOrderForm } from "@/components/subcontract-orders/SubcontractOrderForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewSubcontractOrderPage() {
  return (
    <PagePermissionGuard resource="subcontract_orders" action="create">
      <SubcontractOrderForm order={null} />
    </PagePermissionGuard>
  );
}
