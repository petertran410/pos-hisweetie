"use client";

import { useState } from "react";
import { CashFlowsTable } from "@/components/cashflows/CashFlowsTable";
import { CashFlowsSidebar } from "@/components/cashflows/CashFlowsSidebar";

export default function SoQuyPage() {
  const [filters, setFilters] = useState({});

  const handleCreateReceiptClick = () => {
    console.log("Create receipt");
  };

  const handleCreatePaymentClick = () => {
    console.log("Create payment");
  };

  return (
    <div className="flex h-full border-t">
      <CashFlowsSidebar filters={filters} onFiltersChange={setFilters} />
      <CashFlowsTable
        filters={filters}
        onCreateReceiptClick={handleCreateReceiptClick}
        onCreatePaymentClick={handleCreatePaymentClick}
      />
    </div>
  );
}
