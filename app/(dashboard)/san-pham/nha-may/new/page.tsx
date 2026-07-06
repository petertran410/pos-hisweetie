"use client";

import { FactoryForm } from "@/components/factories/FactoryForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewFactoryPage() {
  return (
    <PagePermissionGuard resource="factories" action="create">
      <FactoryForm mode="create" />
    </PagePermissionGuard>
  );
}