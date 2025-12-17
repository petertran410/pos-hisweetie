"use client";

import { useState, useEffect } from "react";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { PriceBookSidebar } from "@/components/price-books/PriceBookSidebar";
import { PriceBookTable } from "@/components/price-books/PriceBookTable";
import { PriceBookForm } from "@/components/price-books/PriceBookForm";
import { PriceBookProductSelector } from "@/components/price-books/PriceBookProductSelector";

export default function PriceBooksPage() {
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<number[]>(
    []
  );
  const [showForm, setShowForm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  const { data: priceBooksData } = usePriceBooks();

  const selectedPriceBooks =
    priceBooksData?.data?.filter((pb) =>
      selectedPriceBookIds.includes(pb.id)
    ) || [];

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Thiết lập giá</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <PriceBookSidebar
          priceBooks={priceBooksData?.data}
          selectedIds={selectedPriceBookIds}
          onSelectedIdsChange={setSelectedPriceBookIds}
          onCreateNew={() => setShowForm(true)}
        />

        <PriceBookTable
          selectedPriceBooks={selectedPriceBooks}
          onAddProducts={() => setShowProductSelector(true)}
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
    </div>
  );
}
