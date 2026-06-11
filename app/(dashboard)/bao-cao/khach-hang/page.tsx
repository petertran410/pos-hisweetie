"use client";

import { useState, useCallback } from "react";
import {
  CustomerReportSidebar,
  ReportType,
  CustomerMode,
} from "@/components/reports/CustomerReportSidebar";
import { CustomerSalesPreview } from "@/components/reports/CustomerSalesPreview";
import { ProductByCustomerPreview } from "@/components/reports/ProductByCustomerPreview";
import { CustomerDebtPreview } from "@/components/reports/CustomerDebtPreview";
import { CustomerChartPanel } from "@/components/reports/customer/CustomerChartPanel";
import { ReportFilters } from "@/lib/api/reports";

export default function CustomerReportPage() {
  const [reportType, setReportType] = useState<ReportType>("customer-sales");
  const [mode, setMode] = useState<CustomerMode>("data");
  const [filters, setFilters] = useState<ReportFilters>({});

  const handleFiltersChange = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <CustomerReportSidebar
        onFiltersChange={handleFiltersChange}
        reportType={reportType}
        onReportTypeChange={setReportType}
        mode={mode}
        onModeChange={setMode}
      />
      {mode === "chart" ? (
        <CustomerChartPanel
          key={reportType}
          filters={filters}
          reportType={reportType}
        />
      ) : (
        <>
          {reportType === "customer-sales" && (
            <CustomerSalesPreview filters={filters} />
          )}
          {reportType === "product-by-customer" && (
            <ProductByCustomerPreview filters={filters} />
          )}
          {reportType === "customer-debt" && (
            <CustomerDebtPreview filters={filters} />
          )}
        </>
      )}
    </div>
  );
}
