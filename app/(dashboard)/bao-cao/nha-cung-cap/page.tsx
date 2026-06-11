"use client";

import { useState, useCallback } from "react";
import {
  SupplierReportSidebar,
  SupplierMode,
} from "@/components/reports/supplier/SupplierReportSidebar";
import { SupplierChartPanel } from "@/components/reports/supplier/SupplierChartPanel";
import { SupplierDataPanel } from "@/components/reports/supplier/SupplierDataPanel";
import { SupplierReportFilters, SupplierViewType } from "@/lib/api/reports";

export default function SupplierReportPage() {
  const [viewType, setViewType] =
    useState<SupplierViewType>("PurchaseBySupplier");
  const [mode, setMode] = useState<SupplierMode>("chart");
  const [filters, setFilters] = useState<SupplierReportFilters>({});

  const handleFiltersChange = useCallback((f: SupplierReportFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <SupplierReportSidebar
        viewType={viewType}
        onViewTypeChange={setViewType}
        mode={mode}
        onModeChange={setMode}
        onFiltersChange={handleFiltersChange}
      />
      {mode === "chart" ? (
        <SupplierChartPanel key={viewType} filters={filters} viewType={viewType} />
      ) : (
        <SupplierDataPanel key={viewType} filters={filters} viewType={viewType} />
      )}
    </div>
  );
}
