"use client";

import { useState, useEffect, useRef } from "react";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown } from "lucide-react";

interface PriceBookDropdownProps {
  selectedPriceBookId: number | null;
  onSelectPriceBook: (priceBookId: number | null) => void;
}

export function PriceBookDropdown({
  selectedPriceBookId,
  onSelectPriceBook,
}: PriceBookDropdownProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: priceBooksData } = usePriceBooks({
    isActive: true,
    branchId: selectedBranch?.id,
  });

  const priceBooks = priceBooksData?.data || [];

  const filteredPriceBooks = priceBooks.filter((pb) =>
    pb.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPriceBook = (priceBookId: number | null) => {
    onSelectPriceBook(priceBookId);
    setShowDropdown(false);
    setSearch("");
  };

  const getDisplayName = () => {
    if (selectedPriceBookId === null || selectedPriceBookId === 0) {
      return "Bảng giá chung";
    }
    const selectedPriceBook = priceBooks.find(
      (pb) => pb.id === selectedPriceBookId
    );
    return selectedPriceBook?.name || "Bảng giá chung";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-3 py-2 border rounded-xl hover:bg-gray-50 flex items-center gap-2">
        <span>{getDisplayName()}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg w-80 z-50 flex flex-col max-h-96">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Tìm bảng giá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1">
            <button
              onClick={() => handleSelectPriceBook(null)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 border-b ${
                selectedPriceBookId === null || selectedPriceBookId === 0
                  ? "bg-blue-50 font-medium"
                  : ""
              }`}>
              Bảng giá chung
            </button>

            {filteredPriceBooks.length > 0
              ? filteredPriceBooks.map((priceBook) => (
                  <button
                    key={priceBook.id}
                    onClick={() => handleSelectPriceBook(priceBook.id)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 border-b ${
                      selectedPriceBookId === priceBook.id
                        ? "bg-blue-50 font-medium"
                        : ""
                    }`}>
                    {priceBook.name}
                  </button>
                ))
              : search && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Không tìm thấy bảng giá
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
}
