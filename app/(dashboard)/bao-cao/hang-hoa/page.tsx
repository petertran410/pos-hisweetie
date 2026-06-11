"use client";

import { useState, useCallback } from "react";
import {
  ProductReportSidebar,
  ProductMode,
} from "@/components/reports/product/ProductReportSidebar";
import { ProductChartPanel } from "@/components/reports/product/ProductChartPanel";
import { ProductDataPanel } from "@/components/reports/product/ProductDataPanel";
import { ProductReportFilters, ProductViewType } from "@/lib/api/reports";

export default function ProductReportPage() {
  const [viewType, setViewType] = useState<ProductViewType>("ProductBySale");
  const [mode, setMode] = useState<ProductMode>("chart");
  const [filters, setFilters] = useState<ProductReportFilters>({});

  const handleFiltersChange = useCallback((f: ProductReportFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <ProductReportSidebar
        viewType={viewType}
        onViewTypeChange={setViewType}
        mode={mode}
        onModeChange={setMode}
        onFiltersChange={handleFiltersChange}
      />
      {mode === "chart" ? (
        <ProductChartPanel key={viewType} filters={filters} viewType={viewType} />
      ) : (
        <ProductDataPanel key={viewType} filters={filters} viewType={viewType} />
      )}
    </div>
  );
}
