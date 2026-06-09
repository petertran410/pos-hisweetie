"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { HoaDonVatTable } from "@/components/invoices-vat/HoaDonVatTable";
import { HoaDonVatMobileView } from "@/components/invoices-vat/HoaDonVatMobileView";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function HoaDonVatPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam
      ? { search: codeParam }
      : {
          pageSize: 15,
          currentItem: 0,
        }
  );

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="vat_invoices" action="view">
      <div
        className="hidden md:flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <InvoicesSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showMisaEmployeeFilter
        />
        <HoaDonVatTable filters={filters} />
      </div>

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-full">
        <HoaDonVatMobileView
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
