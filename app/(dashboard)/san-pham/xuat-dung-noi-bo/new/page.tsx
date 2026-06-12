"use client";

import { InternalUseForm } from "@/components/internal-uses/InternalUseForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewInternalUsePage() {
  return (
    <PagePermissionGuard resource="internal-use" action="create">
      <InternalUseForm />
    </PagePermissionGuard>
  );
}
