"use client";

import { DestructionForm } from "@/components/destructions/DestructionForm";
import { Can } from "@/components/permissions/Can";

export default function NewDestructionPage() {
  return (
    <Can resource="inventory" action="view">
      <DestructionForm />
    </Can>
  );
}
