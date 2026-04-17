"use client";

import { useState } from "react";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useSearchParams } from "next/navigation";
import { Can } from "@/components/permissions/Can";

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [selectedParentName, setSelectedParentName] = useState<
    string | undefined
  >();
  const [selectedMiddleName, setSelectedMiddleName] = useState<
    string | undefined
  >();
  const [selectedChildName, setSelectedChildName] = useState<
    string | undefined
  >();
  const canCreate = usePermission("products", "create");
  const canUpdate = usePermission("products", "update");
  const canDelete = usePermission("products", "delete");

  return (
    <Can resource="products" action="view">
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <ProductSidebar
          selectedParentName={selectedParentName}
          selectedMiddleName={selectedMiddleName}
          selectedChildName={selectedChildName}
          onSelectedParentNameChange={setSelectedParentName}
          onSelectedMiddleNameChange={setSelectedMiddleName}
          onSelectedChildNameChange={setSelectedChildName}
        />
        <ProductTable
          selectedParentName={selectedParentName}
          selectedMiddleName={selectedMiddleName}
          selectedChildName={selectedChildName}
          codeFilter={codeParam || undefined}
        />
      </div>
    </Can>
  );
}
