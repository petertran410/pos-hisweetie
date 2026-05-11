"use client";

import { useState, useCallback } from "react";
import {
  CustomerReportSidebar,
  ReportType,
} from "@/components/reports/CustomerReportSidebar";
import { CustomerSalesPreview } from "@/components/reports/CustomerSalesPreview";
import { ProductByCustomerPreview } from "@/components/reports/ProductByCustomerPreview";
import { ReportFilters } from "@/lib/api/reports";

export default function CustomerReportPage() {
  const [reportType, setReportType] = useState<ReportType>("customer-sales");
  const [filters, setFilters] = useState<ReportFilters>({});

  const handleFiltersChange = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="flex h-full border-t bg-gray-50 w-screen">
      <CustomerReportSidebar
        onFiltersChange={handleFiltersChange}
        reportType={reportType}
        onReportTypeChange={setReportType}
      />
      {reportType === "customer-sales" ? (
        <CustomerSalesPreview filters={filters} />
      ) : (
        <ProductByCustomerPreview filters={filters} />
      )}
    </div>
  );
}
