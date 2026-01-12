"use client";

import { useState } from "react";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductListPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  return (
    <div className="flex h-full border-t bg-gray-50 w-screen">
      <ProductSidebar
        selectedCategoryIds={selectedCategoryIds}
        onSelectedCategoryIdsChange={setSelectedCategoryIds}
      />
      <ProductTable selectedCategoryIds={selectedCategoryIds} />
    </div>
  );
}
