"use client";

import { useState } from "react";
import { useRootCategories } from "@/lib/hooks/useCategories";
import { CategorySelectorModal } from "@/components/products/CategorySelectorModal";
import type { PriceBook } from "@/lib/api/price-books";
import type { Category } from "@/lib/api/categories";

interface PriceBookSidebarProps {
  priceBooks?: PriceBook[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onCreateNew: () => void;
  selectedCategoryIds: number[];
  onSelectedCategoryIdsChange: (ids: number[]) => void;
}

export function PriceBookSidebar({
  priceBooks,
  selectedIds,
  onSelectedIdsChange,
  onCreateNew,
  selectedCategoryIds,
  onSelectedCategoryIdsChange,
}: PriceBookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const { data: categories } = useRootCategories();

  const filteredPriceBooks = priceBooks?.filter((pb) =>
    pb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePriceBook = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const getDisplayText = () => {
    if (selectedIds.length === 0) return "Chọn bảng giá";

    const hasDefaultPriceBook = selectedIds.includes(0);
    const realPriceBooks = selectedIds.filter((id) => id !== 0);

    if (hasDefaultPriceBook && realPriceBooks.length === 0) {
      return "Bảng giá chung";
    }

    if (hasDefaultPriceBook && realPriceBooks.length > 0) {
      return `Bảng giá chung + ${realPriceBooks.length} bảng giá`;
    }

    if (realPriceBooks.length === 1) {
      const selected = priceBooks?.find((pb) => pb.id === realPriceBooks[0]);
      return selected?.name || "Chọn bảng giá";
    }

    return `Đã chọn ${realPriceBooks.length} bảng giá`;
  };

  const flattenCategories = (cats: Category[]): Category[] => {
    return cats.reduce((acc, cat) => {
      acc.push(cat);
      if (cat.children) {
        acc.push(...flattenCategories(cat.children));
      }
      return acc;
    }, [] as Category[]);
  };

  const getSelectedCategoryNames = () => {
    if (!categories || selectedCategoryIds.length === 0) return "";
    const allCategories = flattenCategories(categories);
    const selectedNames = selectedCategoryIds
      .map((id) => allCategories.find((cat) => cat.id === id)?.name)
      .filter(Boolean);
    if (selectedNames.length === 0) return "";
    if (selectedNames.length === 1) return selectedNames[0];
    return `${selectedNames.length} nhóm đã chọn`;
  };

  return (
    <div className="w-80 border-r bg-gray-50 p-4 space-y-4">
      <div>
        <label className="block text-md font-medium mb-2">Bảng giá</label>
        <div className="relative">
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex items-center justify-between">
            <span className="text-md">{getDisplayText()}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-80 overflow-y-auto">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Tìm kiếm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-md"
                  autoFocus
                />
              </div>

              <div className="p-2 border-b">
                <button
                  onClick={() => {
                    onCreateNew();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-md text-blue-600 hover:bg-blue-50 rounded">
                  + Tạo mới
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <label
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 border-b ${
                    selectedIds.includes(0) ? "bg-blue-50" : ""
                  }`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(0)}
                    onChange={() => togglePriceBook(0)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-md flex-1 font-medium">
                    Bảng giá chung
                  </span>
                </label>

                {filteredPriceBooks?.map((pb) => (
                  <label
                    key={pb.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                      selectedIds.includes(pb.id) ? "bg-blue-50" : ""
                    }`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(pb.id)}
                      onChange={() => togglePriceBook(pb.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-md flex-1">{pb.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-md font-medium mb-2">Nhóm hàng</label>
        <button
          onClick={() => setShowCategorySelector(true)}
          className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 bg-white">
          <span className="text-md">
            {getSelectedCategoryNames() || "Chọn nhóm hàng"}
          </span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div>
        <label className="block text-md font-medium mb-2">Tồn kho</label>
        <select className="w-full border rounded px-3 py-2 bg-white text-md">
          <option value="">Chọn điều kiện</option>
          <option value="all">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
        </select>
      </div>

      <div>
        <label className="block text-md font-medium mb-2">Giá bán</label>
        <select className="w-full border rounded px-3 py-2 bg-white text-md">
          <option value="">Chọn giá so sánh</option>
        </select>
      </div>

      {showCategorySelector && categories && (
        <CategorySelectorModal
          categories={categories}
          selectedIds={selectedCategoryIds}
          onApply={onSelectedCategoryIdsChange}
          onClose={() => setShowCategorySelector(false)}
        />
      )}
    </div>
  );
}
