"use client";

import { InventoryChecksTable } from "@/components/inventory-checks/InventoryChecksTable";
import { Can } from "@/components/permissions/Can";

export default function InventoryCheckPage() {
  return (
    <Can resource="inventory_checks" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <InventoryChecksTable />
      </div>
    </Can>
  );
}
