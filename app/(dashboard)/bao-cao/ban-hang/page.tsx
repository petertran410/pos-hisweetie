"use client";

import { useState, useCallback, useMemo } from "react";
import {
  SaleReportSidebar,
  SaleMode,
} from "@/components/reports/SaleReportSidebar";
import { SaleChartPanel } from "@/components/reports/sale/SaleChartPanel";
import { SaleDataPanel } from "@/components/reports/sale/SaleDataPanel";
import { SaleReportFilters, SaleViewType } from "@/lib/api/reports";
import { useBranches } from "@/lib/hooks/useBranches";

export default function SaleReportPage() {
  const [viewType, setViewType] = useState<SaleViewType>("PurchaseDate");
  const [mode, setMode] = useState<SaleMode>("chart");
  const [filters, setFilters] = useState<SaleReportFilters>({});

  const { data: branches } = useBranches();
  const branchCount = useMemo(() => (branches || []).length, [branches]);

  const handleFiltersChange = useCallback((f: SaleReportFilters) => {
    setFilters(f);
  }, []);

  // Đổi viewType về Branch nhưng chỉ 1 chi nhánh → fallback PurchaseDate
  const handleViewTypeChange = useCallback(
    (v: SaleViewType) => {
      if (v === "Branch" && branchCount <= 1) return;
      setViewType(v);
    },
    [branchCount]
  );

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <SaleReportSidebar
        viewType={viewType}
        onViewTypeChange={handleViewTypeChange}
        mode={mode}
        onModeChange={setMode}
        onFiltersChange={handleFiltersChange}
        branchCount={branchCount}
      />
      {mode === "chart" ? (
        <SaleChartPanel key={viewType} filters={filters} viewType={viewType} />
      ) : (
        <SaleDataPanel key={viewType} filters={filters} viewType={viewType} />
      )}
    </div>
  );
}
