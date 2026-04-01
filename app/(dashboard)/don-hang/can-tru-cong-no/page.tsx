"use client";

import { useState } from "react";
import { DebtOffsetsTable } from "@/components/debt-offsets/DebtOffsetsTable";
import { DebtOffsetsSidebar } from "@/components/debt-offsets/DebtOffsetsSidebar";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function CanTruCongNoPage() {
  const [filters, setFilters] = useState({});

  return (
    <PagePermissionGuard resource="return_orders" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <DebtOffsetsSidebar onFiltersChange={setFilters} />
        <DebtOffsetsTable filters={filters} />
      </div>
    </PagePermissionGuard>
  );
}
