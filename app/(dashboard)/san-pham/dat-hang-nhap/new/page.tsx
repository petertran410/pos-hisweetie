import { OrderSupplierForm } from "@/components/order-suppliers/OrderSupplierForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewOrderSupplierPage() {
  return (
    <PagePermissionGuard resource="order_suppliers" action="create">
      <OrderSupplierForm />
    </PagePermissionGuard>
  );
}
