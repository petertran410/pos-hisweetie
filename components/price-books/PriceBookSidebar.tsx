"use client";

import { useState } from "react";
import type { PriceBook } from "@/lib/api/price-books";

interface PriceBookSidebarProps {
  priceBooks?: PriceBook[];
  selected: PriceBook | null;
  onSelect: (priceBook: PriceBook) => void;
  onCreateNew: () => void;
}

export function PriceBookSidebar({
  priceBooks,
  selected,
  onSelect,
  onCreateNew,
}: PriceBookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredPriceBooks = priceBooks?.filter((pb) =>
    pb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r bg-gray-50 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Bảng giá</label>
        <div className="relative">
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex items-center justify-between">
            <span className="text-sm">
              {selected ? selected.name : "Chọn bảng giá"}
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

              <div className="p-2">
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
                  <button
                    key={pb.id}
                    onClick={() => {
                      onSelect(pb);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      selected?.id === pb.id ? "bg-blue-50 text-blue-600" : ""
                    }`}>
                    <div className="flex items-center justify-between">
                      <span>{pb.name}</span>
                      {selected?.id === pb.id && (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
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
