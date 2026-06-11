"use client";

import { useState, useCallback } from "react";
import { EodReportSidebar } from "@/components/reports/eod/EodReportSidebar";
import { EodPanel } from "@/components/reports/eod/EodPanel";
import { EodReportFilters, EodViewType } from "@/lib/api/reports";

export default function EodReportPage() {
  const [viewType, setViewType] = useState<EodViewType>("Synthetic");
  const [filters, setFilters] = useState<EodReportFilters>({});

  const handleFiltersChange = useCallback((f: EodReportFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <EodReportSidebar
        viewType={viewType}
        onViewTypeChange={setViewType}
        onFiltersChange={handleFiltersChange}
      />
      <EodPanel filters={filters} viewType={viewType} />
    </div>
  );
}
