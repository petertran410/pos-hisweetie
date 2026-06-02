"use client";

import { useState, useEffect, useRef } from "react";
import { useApplicablePriceBooks } from "@/lib/hooks/usePriceBooks";
import { useBranchStore } from "@/lib/store/branch";
import { useAuthStore } from "@/lib/store/auth";
import { ChevronDown } from "lucide-react";
import { priceBooksApi } from "@/lib/api";
import { toast } from "sonner";

interface PriceBookDropdownProps {
  selectedPriceBookId: number | null;
  selectedPriceBookName?: string | null;
  onSelectPriceBook: (
    priceBookId: number | null,
    priceBookName: string | null
  ) => void;
  cartItems?: any[];
  selectedCustomerId?: number | null;
}

export function PriceBookDropdown({
  selectedPriceBookId,
  selectedPriceBookName,
  onSelectPriceBook,
  cartItems,
  selectedCustomerId,
}: PriceBookDropdownProps) {
  const { selectedBranch } = useBranchStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: applicablePriceBooks } = useApplicablePriceBooks({
    branchId: selectedBranch?.id,
    customerId: selectedCustomerId ?? undefined,
    userId: user?.id,
  });

  const priceBooks = applicablePriceBooks || [];

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

  const handleSelectPriceBook = async (priceBookId: number | null) => {
    if (priceBookId && priceBookId > 0 && cartItems && cartItems.length > 0) {
      try {
        const pb = await priceBooksApi.getPriceBook(priceBookId);
        if (!pb.allowNonListedProducts) {
          const allowedIds = new Set(
            (pb.priceBookDetails || [])
              .filter((d: any) => d.isActive)
              .map((d: any) => d.productId)
          );
          const violating = cartItems
            .map((it: any) => it.product)
            .filter((p: any) => p && !allowedIds.has(p.id));
          if (violating.length > 0) {
            toast.error(
              `Trong giỏ có ${violating.length} sản phẩm không thuộc bảng giá "${pb.name}". Vui lòng xoá trước khi đổi.`
            );
            return;
          }
        }
      } catch (e) {
        toast.error("Không thể kiểm tra bảng giá. Vui lòng thử lại.");
        return;
      }
    }
    const pb = priceBooks.find((p) => p.id === priceBookId);
    onSelectPriceBook(priceBookId, pb?.name ?? null);
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
    if (selectedPriceBook) return selectedPriceBook.name;
    // Fallback: snapshot name từ existing order/invoice
    return selectedPriceBookName || "Bảng giá chung";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="pl-1.5 lg:pl-2 px-1 py-0.5 lg:py-1 border rounded-lg hover:bg-gray-50 flex items-center gap-1.5 lg:gap-4 text-xs lg:text-sm">
        <span className="truncate">{getDisplayName()}</span>
        <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg w-40 lg:w-80 z-50 flex flex-col max-h-96 text-xs lg:text-sm">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Tìm bảng giá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded px-3 py-2 text-xs lg:text-sm"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${
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
