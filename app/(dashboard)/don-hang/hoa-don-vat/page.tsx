"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { HoaDonVatTable } from "@/components/invoices-vat/HoaDonVatTable";
import { HoaDonVatMobileView } from "@/components/invoices-vat/HoaDonVatMobileView";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function HoaDonVatPage() {
  const router = useRouter();
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

  const handleCreateClick = () => {
    router.push("/ban-hang?type=invoice&from=hoa-don-vat");
  };

  return (
    <PagePermissionGuard resource="invoices" action="view">
      <div className="hidden md:flex h-full border-t bg-gray-50">
        <InvoicesSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <HoaDonVatTable filters={filters} onCreateClick={handleCreateClick} />
      </div>

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-full">
        <HoaDonVatMobileView
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateClick={handleCreateClick}
        />
      </div>
    </PagePermissionGuard>
  );
}
