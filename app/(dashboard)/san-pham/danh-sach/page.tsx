"use client";

import { useState } from "react";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductListPage() {
  const [selectedParentNames, setSelectedParentNames] = useState<string[]>([]);
  const [selectedMiddleNames, setSelectedMiddleNames] = useState<string[]>([]);
  const [selectedChildNames, setSelectedChildNames] = useState<string[]>([]);

  return (
    <div className="flex h-full border-t bg-gray-50 w-screen">
      <ProductSidebar
        selectedParentNames={selectedParentNames}
        selectedMiddleNames={selectedMiddleNames}
        selectedChildNames={selectedChildNames}
        onSelectedParentNamesChange={setSelectedParentNames}
        onSelectedMiddleNamesChange={setSelectedMiddleNames}
        onSelectedChildNamesChange={setSelectedChildNames}
      />
      <ProductTable
        selectedParentNames={selectedParentNames}
        selectedMiddleNames={selectedMiddleNames}
        selectedChildNames={selectedChildNames}
      />
    </div>
  );
}
