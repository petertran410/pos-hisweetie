"use client";

import { useState } from "react";
import type { PriceBook } from "@/lib/api/price-books";

interface PriceBookSidebarProps {
  priceBooks?: PriceBook[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onCreateNew: () => void;
}

export function PriceBookSidebar({
  priceBooks,
  selectedIds,
  onSelectedIdsChange,
  onCreateNew,
}: PriceBookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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
    if (selectedIds.length === 1) {
      const selected = priceBooks?.find((pb) => pb.id === selectedIds[0]);
      return selected?.name || "Chọn bảng giá";
    }
    return `Đã chọn ${selectedIds.length} bảng giá`;
  };

  return (
    <div className="w-80 border-r bg-gray-50 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Bảng giá</label>
        <div className="relative">
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex items-center justify-between">
            <span className="text-sm">{getDisplayText()}</span>
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
                  className="w-full border rounded px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div className="p-2 border-b">
                <button
                  onClick={() => {
                    onCreateNew();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                  + Tạo mới
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto">
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
                    <span className="text-sm flex-1">{pb.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Nhóm hàng</label>
        <select className="w-full border rounded px-3 py-2 bg-white text-sm">
          <option value="">Chọn nhóm hàng</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tồn kho</label>
        <select className="w-full border rounded px-3 py-2 bg-white text-sm">
          <option value="">Chọn điều kiện</option>
          <option value="all">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Giá bán</label>
        <select className="w-full border rounded px-3 py-2 bg-white text-sm">
          <option value="">Chọn giá so sánh</option>
        </select>
      </div>
    </div>
  );
}
