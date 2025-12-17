"use client";

import { useState } from "react";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { PriceBookSidebar } from "@/components/price-books/PriceBookSidebar";
import { PriceBookTable } from "@/components/price-books/PriceBookTable";
import { PriceBookForm } from "@/components/price-books/PriceBookForm";
import { PriceBookProductSelector } from "@/components/price-books/PriceBookProductSelector";
import type { PriceBook } from "@/lib/api/price-books";

export default function PriceBooksPage() {
  const [selectedPriceBook, setSelectedPriceBook] = useState<PriceBook | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  const { data: priceBooksData } = usePriceBooks();

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Bảng giá chung</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <PriceBookSidebar
          priceBooks={priceBooksData?.data}
          selected={selectedPriceBook}
          onSelect={setSelectedPriceBook}
          onCreateNew={() => {
            setSelectedPriceBook(null);
            setShowForm(true);
          }}
        />

        <PriceBookTable
          priceBookId={selectedPriceBook?.id || null}
          onAddProducts={() => setShowProductSelector(true)}
        />
      </div>

      {showForm && (
        <PriceBookForm
          priceBook={selectedPriceBook}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
          }}
        />
      )}

      {showProductSelector && selectedPriceBook && (
        <PriceBookProductSelector
          priceBookId={selectedPriceBook.id}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </div>
  );
}
