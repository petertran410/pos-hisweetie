"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { misaApi, MisaInventoryItem } from "@/lib/api/misa";

interface MisaItemDropdownProps {
  label: string;
  placeholder: string;
  /** Mã Misa hiện đang liên kết (misa_code) */
  value?: string;
  /** Tên Misa hiện đang liên kết (misa_name) — dùng để hiển thị khi chưa search */
  valueName?: string;
  onChange: (item: MisaInventoryItem | null) => void;
}

export function MisaItemDropdown({
  label,
  placeholder,
  value,
  valueName,
  onChange,
}: MisaItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce ô tìm kiếm để tránh gọi API liên tục.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["misa-inventory-items", debouncedQuery],
    queryFn: () => misaApi.searchInventoryItems(debouncedQuery || undefined, 50),
    enabled: isOpen,
    staleTime: 60_000,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Nhãn hiển thị: ưu tiên tên đã liên kết, fallback mã.
  const displayLabel = value
    ? valueName
      ? `${value} - ${valueName}`
      : value
    : "";

  const handleSelect = (item: MisaInventoryItem) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
        <span className={displayLabel ? "text-gray-900" : "text-gray-500"}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e as any);
                }
              }}
              className="hover:bg-gray-200 rounded p-1 cursor-pointer">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
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
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Đang tải...</div>
            ) : items && items.length > 0 ? (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    value === item.code
                      ? "bg-brand-soft text-brand-dark font-medium"
                      : ""
                  }`}>
                  <span className="font-medium">{item.code}</span>
                  <span className="text-gray-600"> - {item.name}</span>
                  {item.unitName ? (
                    <span className="text-gray-400"> ({item.unitName})</span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
