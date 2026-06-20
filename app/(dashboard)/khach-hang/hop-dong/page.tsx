"use client";

import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { ContractsTable } from "@/components/contracts/ContractsTable";

export default function ContractsPage() {
  return (
    <PagePermissionGuard resource="contracts" action="view">
      <div
        className="flex h-full border-t w-screen"
        style={{ borderColor: "var(--dt-border)" }}>
        <ContractsTable />
      </div>
    </PagePermissionGuard>
  );
}
