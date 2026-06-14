import { ConsignmentForm } from "@/components/consignments/ConsignmentForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewConsignmentPage() {
  return (
    <PagePermissionGuard resource="consignments" action="create">
      <ConsignmentForm />
    </PagePermissionGuard>
  );
}
