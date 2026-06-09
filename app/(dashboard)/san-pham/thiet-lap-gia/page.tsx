"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { PriceBookSidebar } from "@/components/price-books/PriceBookSidebar";
import { PriceBookTable } from "@/components/price-books/PriceBookTable";
import { PriceBookForm } from "@/components/price-books/PriceBookForm";
import { PriceBookProductSelector } from "@/components/price-books/PriceBookProductSelector";
import { useBranchStore } from "@/lib/store/branch";
import { PriceBookImportModal } from "@/components/price-books/PriceBookImportModal";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { PriceBook } from "@/lib/api";

export default function PriceBooksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init từ URL (lazy) — survive reload
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<number[]>(
    () => {
      const raw = searchParams.get("priceBookIds");
      if (raw === null) return [0]; // default lần đầu vào trang
      if (raw === "" || raw === "none") return []; // deselect tất cả
      return raw
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n));
    }
  );

  const [filters, setFilters] = useState<any>(() => {
    const f: any = {};
    const parent = searchParams.get("parentName");
    const middle = searchParams.get("middleName");
    const child = searchParams.get("childName");
    const stock = searchParams.get("stockStatus");
    if (parent) f.parentName = parent;
    if (middle) f.middleName = middle;
    if (child) f.childName = child;
    if (stock) f.stockStatus = stock;
    return f;
  });

  const [formState, setFormState] = useState<{
    open: boolean;
    priceBook: PriceBook | null;
  }>({ open: false, priceBook: null });
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { selectedBranch } = useBranchStore();

  const { data: priceBooksData } = usePriceBooks({
    branchId: selectedBranch?.id,
    limit: 1000,
  });

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedPriceBookIds.length === 0) {
      // Deselect tất cả → "none" để phân biệt với "lần đầu vào trang"
      params.set("priceBookIds", "none");
    } else if (
      !(
        selectedPriceBookIds.length === 1 && selectedPriceBookIds[0] === 0
      )
    ) {
      // Mặc định [0] (Bảng giá chung) → bỏ qua param cho URL gọn
      params.set("priceBookIds", selectedPriceBookIds.join(","));
    }

    if (filters.parentName) params.set("parentName", filters.parentName);
    if (filters.middleName) params.set("middleName", filters.middleName);
    if (filters.childName) params.set("childName", filters.childName);
    if (filters.stockStatus) params.set("stockStatus", filters.stockStatus);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedPriceBookIds, filters, pathname, router]);

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
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <PriceBookSidebar
          priceBooks={priceBooksData?.data}
          selectedIds={selectedPriceBookIds}
          onSelectedIdsChange={setSelectedPriceBookIds}
          onCreateNew={() => setFormState({ open: true, priceBook: null })}
          onEditPriceBook={(pb) => setFormState({ open: true, priceBook: pb })}
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
        />

        <PriceBookTable
          selectedPriceBooks={selectedPriceBooks}
          onAddProducts={() => setShowProductSelector(true)}
          onCreateNew={() => setFormState({ open: true, priceBook: null })}
          onEditPriceBook={(pb) => setFormState({ open: true, priceBook: pb })}
          onImportClick={() => setShowImportModal(true)}
          filters={filters}
          branchId={selectedBranch?.id}
        />
      </div>

      {formState.open && (
        <PriceBookForm
          priceBook={formState.priceBook}
          onClose={() => setFormState({ open: false, priceBook: null })}
          onSuccess={() => setFormState({ open: false, priceBook: null })}
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
