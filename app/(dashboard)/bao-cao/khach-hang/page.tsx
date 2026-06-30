"use client";

import { useState, useCallback } from "react";
import {
  CustomerReportSidebar,
  CustomerMode,
} from "@/components/reports/customer/CustomerReportSidebar";
import { CustomerChartPanel } from "@/components/reports/customer/CustomerChartPanel";
import { CustomerDataPanel } from "@/components/reports/customer/CustomerDataPanel";
import { CustomerReportFilters, CustomerViewType } from "@/lib/api/reports";

export default function CustomerReportPage() {
  const [viewType, setViewType] = useState<CustomerViewType>("CustomerBySale");
  const [mode, setMode] = useState<CustomerMode>("chart");
  const [filters, setFilters] = useState<CustomerReportFilters>({});

  const handleFiltersChange = useCallback((f: CustomerReportFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <CustomerReportSidebar
        viewType={viewType}
        onViewTypeChange={setViewType}
        mode={mode}
        onModeChange={setMode}
        onFiltersChange={handleFiltersChange}
      />
      {mode === "chart" ? (
        <CustomerChartPanel key={viewType} filters={filters} viewType={viewType} />
      ) : (
        <CustomerDataPanel key={viewType} filters={filters} viewType={viewType} />
      )}
    </div>
  );
}
