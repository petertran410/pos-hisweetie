"use client";

import { useState } from "react";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductListPage() {
  const [selectedParentName, setSelectedParentName] = useState<
    string | undefined
  >();
  const [selectedMiddleName, setSelectedMiddleName] = useState<
    string | undefined
  >();
  const [selectedChildName, setSelectedChildName] = useState<
    string | undefined
  >();

  return (
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
      />
    </div>
  );
}
