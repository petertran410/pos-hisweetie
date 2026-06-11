"use client";

import { useState, useCallback } from "react";
import {
  FinancialReportSidebar,
  FinancialMode,
} from "@/components/reports/financial/FinancialReportSidebar";
import { FinancialChartPanel } from "@/components/reports/financial/FinancialChartPanel";
import { FinancialDataPanel } from "@/components/reports/financial/FinancialDataPanel";
import { FinancialReportFilters, FinancialViewType } from "@/lib/api/reports";

export default function FinancialReportPage() {
  const [viewType, setViewType] = useState<FinancialViewType>("CashByGroup");
  const [mode, setMode] = useState<FinancialMode>("chart");
  const [filters, setFilters] = useState<FinancialReportFilters>({});

  const handleFiltersChange = useCallback((f: FinancialReportFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <FinancialReportSidebar
        viewType={viewType}
        onViewTypeChange={setViewType}
        mode={mode}
        onModeChange={setMode}
        onFiltersChange={handleFiltersChange}
      />
      {mode === "chart" ? (
        <FinancialChartPanel key={viewType} filters={filters} viewType={viewType} />
      ) : (
        <FinancialDataPanel key={viewType} filters={filters} viewType={viewType} />
      )}
    </div>
  );
}
