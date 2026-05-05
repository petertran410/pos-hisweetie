"use client";

import { DestructionForm } from "@/components/destructions/DestructionForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function NewDestructionPage() {
  return (
    <PagePermissionGuard resource="destructions" action="create">
      <DestructionForm />
    </PagePermissionGuard>
  );
}
