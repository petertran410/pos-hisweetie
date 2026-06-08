"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [activeTab, setActiveTab] = useState<Tab>("customer");
  const [sidebarFilters, setSidebarFilters] = useState<any>({});

  // Khi đang lọc theo Code: bỏ qua filter sidebar, chỉ tìm theo mã
  const handleSidebarFiltersChange = (f: any) => {
    if (codeParam) return;
    setSidebarFilters(f);
  };

  const customerFilters = {
    ...sidebarFilters,
    ...(codeParam ? { search: codeParam } : {}),
    refundType: "debt_offsets",
    status: 4,
  };

  const supplierFilters = {
    ...sidebarFilters,
    ...(codeParam ? { search: codeParam } : {}),
  };

  return (
    <PagePermissionGuard resource="return_orders" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <DebtOffsetsSidebar onFiltersChange={handleSidebarFiltersChange} />

        <div className="flex-1 flex flex-col overflow-hidden mt-4 mr-4 mb-4">
          {/* Tab bar */}
          <div className="flex gap-1 border-b bg-white rounded-t-xl px-4 pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? "border-brand text-brand"
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
