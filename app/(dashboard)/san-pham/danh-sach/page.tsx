"use client";

import { useState, useCallback } from "react";
import { ProductsSidebar } from "@/components/products/ProductSidebar";
import { ProductsTable } from "@/components/products/ProductTable";
import { useSearchParams } from "next/navigation";
import { Can } from "@/components/permissions/Can";

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>({});

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
    <Can resource="products" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <ProductsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <ProductsTable filters={filters} codeFilter={codeParam || undefined} />
      </div>
    </Can>
  );
}
