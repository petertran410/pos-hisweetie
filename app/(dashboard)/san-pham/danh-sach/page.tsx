"use client";

import { useState, useCallback } from "react";
import { ProductsSidebar } from "@/components/products/ProductSidebar";
import { ProductsTable } from "@/components/products/ProductTable";
import { ProductsMobileView } from "@/components/products/ProductsMobileView";
import { useSearchParams } from "next/navigation";
import { ProductImportModal } from "@/components/products/ProductImportModal";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  // Mặc định luôn hiển thị sản phẩm "Đang hoạt động".
  const [filters, setFilters] = useState<any>({ isActive: true });
  const [showImportModal, setShowImportModal] = useState(false);

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
    <PagePermissionGuard resource="products" action="view">
      {/* ── Desktop (md+) — giữ nguyên 100% ── */}
      <div
        className="hidden md:flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <ProductsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <ProductsTable
          filters={filters}
          codeFilter={codeParam || undefined}
          onImportClick={() => setShowImportModal(true)}
        />
      </div>

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-[calc(100vh-56px)] overflow-hidden">
        <ProductsMobileView
          filters={filters}
          onFiltersChange={handleFiltersChange}
          codeFilter={codeParam || undefined}
        />
      </div>

      {showImportModal && (
        <ProductImportModal onClose={() => setShowImportModal(false)} />
      )}
    </PagePermissionGuard>
  );
}
