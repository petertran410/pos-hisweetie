"use client";

import { useState } from "react";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductListPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  return (
    <div className="flex h-full border-t">
      <aside className="w-64 border-r shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ProductSidebar
            selectedCategoryIds={selectedCategoryIds}
            onSelectedCategoryIdsChange={setSelectedCategoryIds}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <ProductTable selectedCategoryIds={selectedCategoryIds} />
      </main>
    </div>
  );
}
