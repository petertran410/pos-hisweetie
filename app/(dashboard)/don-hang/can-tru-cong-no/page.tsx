"use client";

import { useState } from "react";
import { DebtOffsetsTable } from "@/components/debt-offsets/DebtOffsetsTable";
import { SupplierDebtOffsetsTable } from "@/components/debt-offsets/SupplierDebtOffsetsTable";
import { DebtOffsetsSidebar } from "@/components/debt-offsets/DebtOffsetsSidebar";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

type Tab = "customer" | "supplier";

const TABS: { value: Tab; label: string }[] = [
  { value: "customer", label: "Cấn trừ khách hàng" },
  { value: "supplier", label: "Cấn trừ nhà cung cấp" },
];

export default function CanTruCongNoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customer");
  const [sidebarFilters, setSidebarFilters] = useState<any>({});

  const customerFilters = {
    ...sidebarFilters,
    refundType: "debt_offsets",
    status: 4,
  };

  const supplierFilters = {
    ...sidebarFilters,
  };

  return (
    <PagePermissionGuard resource="return_orders" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <DebtOffsetsSidebar onFiltersChange={setSidebarFilters} />

        <div className="flex-1 flex flex-col overflow-hidden mt-4 mr-4 mb-4">
          {/* Tab bar */}
          <div className="flex gap-1 border-b bg-white rounded-t-xl px-4 pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table area */}
          <div className="flex-1 overflow-hidden flex">
            {activeTab === "customer" ? (
              <DebtOffsetsTable filters={customerFilters} />
            ) : (
              <SupplierDebtOffsetsTable filters={supplierFilters} />
            )}
          </div>
        </div>
      </div>
    </PagePermissionGuard>
  );
}
