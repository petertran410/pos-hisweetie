"use client";

import { use } from "react";
import { FactoryForm } from "@/components/factories/FactoryForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function EditFactoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const factoryId = Number(id);

  return (
    <PagePermissionGuard resource="factories" action="update">
      <FactoryForm mode="edit" factoryId={factoryId} />
    </PagePermissionGuard>
  );
}