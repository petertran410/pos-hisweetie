"use client";

import { useState, useCallback } from "react";
import {
  CustomerReportSidebar,
  ReportType,
} from "@/components/reports/CustomerReportSidebar";
import { CustomerSalesPreview } from "@/components/reports/CustomerSalesPreview";
import { ProductByCustomerPreview } from "@/components/reports/ProductByCustomerPreview";
import { CustomerDebtPreview } from "@/components/reports/CustomerDebtPreview";
import { ReportFilters } from "@/lib/api/reports";
import "@/app/dashboard.css";

export default function CustomerReportPage() {
  const [reportType, setReportType] = useState<ReportType>("customer-sales");
  const [filters, setFilters] = useState<ReportFilters>({});

  const handleFiltersChange = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div
      className="dt-dash flex h-full border-t w-screen"
      style={{ borderColor: "var(--dt-border)" }}>
      <CustomerReportSidebar
        onFiltersChange={handleFiltersChange}
        reportType={reportType}
        onReportTypeChange={setReportType}
      />
      {reportType === "customer-sales" && (
        <CustomerSalesPreview filters={filters} />
      )}
      {reportType === "product-by-customer" && (
        <ProductByCustomerPreview filters={filters} />
      )}
      {reportType === "customer-debt" && (
        <CustomerDebtPreview filters={filters} />
      )}
    </div>
  );
}
