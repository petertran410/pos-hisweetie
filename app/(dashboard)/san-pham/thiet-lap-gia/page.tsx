"use client";

import { useState, useCallback } from "react";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { PriceBookSidebar } from "@/components/price-books/PriceBookSidebar";
import { PriceBookTable } from "@/components/price-books/PriceBookTable";
import { PriceBookForm } from "@/components/price-books/PriceBookForm";
import { PriceBookProductSelector } from "@/components/price-books/PriceBookProductSelector";
import { useBranchStore } from "@/lib/store/branch";
import { PriceBookImportModal } from "@/components/price-books/PriceBookImportModal";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function PriceBooksPage() {
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<number[]>([
    0,
  ]);
  const [filters, setFilters] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { selectedBranch } = useBranchStore();

  const { data: priceBooksData } = usePriceBooks({
    branchId: selectedBranch?.id,
    limit: 1000,
  });

  const allPriceBooks = [
    { id: 0, name: "Bảng giá chung" },
    ...(priceBooksData?.data || []),
  ];

  const selectedPriceBooks = allPriceBooks.filter((pb) =>
    selectedPriceBookIds.includes(pb.id)
  );

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  return (
    <PagePermissionGuard resource="price_books" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <PriceBookSidebar
          priceBooks={priceBooksData?.data}
          selectedIds={selectedPriceBookIds}
          onSelectedIdsChange={setSelectedPriceBookIds}
          onCreateNew={() => setShowForm(true)}
          onFiltersChange={handleFiltersChange}
        />

        <PriceBookTable
          selectedPriceBooks={selectedPriceBooks}
          onAddProducts={() => setShowProductSelector(true)}
          onCreateNew={() => setShowForm(true)}
          onImportClick={() => setShowImportModal(true)}
          filters={filters}
          branchId={selectedBranch?.id}
        />
      </div>

      {showForm && (
        <PriceBookForm
          priceBook={null}
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {showProductSelector && selectedPriceBooks.length > 0 && (
        <PriceBookProductSelector
          priceBookId={selectedPriceBooks[0].id}
          onClose={() => setShowProductSelector(false)}
        />
      )}

      {showImportModal && (
        <PriceBookImportModal onClose={() => setShowImportModal(false)} />
      )}
    </PagePermissionGuard>
  );
}
