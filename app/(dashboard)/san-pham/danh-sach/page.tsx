"use client";

import { useState, useCallback } from "react";
import { ProductsSidebar } from "@/components/products/ProductSidebar";
import { ProductsTable } from "@/components/products/ProductTable";
import { useSearchParams } from "next/navigation";
import { ProductImportModal } from "@/components/products/ProductImportModal";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>({});
  const [showImportModal, setShowImportModal] = useState(false);

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="products" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <ProductsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <ProductsTable
          filters={filters}
          codeFilter={codeParam || undefined}
          onImportClick={() => setShowImportModal(true)}
        />
      </div>

      {showImportModal && (
        <ProductImportModal onClose={() => setShowImportModal(false)} />
      )}
    </PagePermissionGuard>
  );
}
