"use client";

import { useState, useRef, useEffect } from "react";
import { TradeMark } from "@/lib/api/trademarks";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { TrademarkModal } from "./TrademarkModal";

interface TrademarkDropdownProps {
  label: string;
  placeholder: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function TrademarkDropdown({
  label,
  placeholder,
  value,
  onChange,
}: TrademarkDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTrademark, setEditingTrademark] = useState<
    TradeMark | undefined
  >();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: trademarks } = useTrademarks();

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

  const filteredTrademarks = trademarks?.filter((tm) =>
    tm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTrademark = trademarks?.find((tm) => tm.id === value);

  const handleSelect = (trademarkId: number) => {
    onChange(trademarkId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleEdit = (e: React.MouseEvent, trademark: TradeMark) => {
    e.stopPropagation();
    setEditingTrademark(trademark);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleCreate = () => {
    setEditingTrademark(undefined);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTrademark(undefined);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
        <span className={selectedTrademark ? "text-gray-900" : "text-gray-500"}>
          {selectedTrademark?.name || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {selectedTrademark && (
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
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="p-2 border-b">
            <button
              type="button"
              onClick={handleCreate}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
              + Tạo mới
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredTrademarks && filteredTrademarks.length > 0 ? (
              filteredTrademarks.map((tm) => (
                <div
                  key={tm.id}
                  className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 group ${
                    value === tm.id ? "bg-blue-50" : ""
                  }`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(tm.id)}
                    className={`flex-1 text-left ${
                      value === tm.id ? "text-blue-700 font-medium" : ""
                    }`}>
                    {tm.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleEdit(e, tm)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <TrademarkModal
          trademark={editingTrademark}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
