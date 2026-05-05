"use client";

import { DestructionForm } from "@/components/destructions/DestructionForm";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function NewDestructionPage() {
  return (
    <PermissionGate resource="inventory" action="view">
      <DestructionForm />
    </PermissionGate>
  );
}
