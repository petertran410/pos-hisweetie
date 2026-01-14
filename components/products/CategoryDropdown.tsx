"use client";

import { useState, useRef, useEffect } from "react";
import { CategoryType, Category } from "@/lib/api/categories";
import { useCategories } from "@/lib/hooks/useCategories";
import { CategoryModal } from "./CategoryModal";

interface CategoryDropdownProps {
  type: CategoryType;
  label: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function CategoryDropdown({
  type,
  label,
  placeholder,
  value,
  onChange,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    Category | undefined
  >();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useCategories(type);

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

  const filteredCategories = categories
    ?.filter((cat) => cat.type === type)
    ?.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSelect = (categoryName: string) => {
    onChange(categoryName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleEdit = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setEditingCategory(category);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleCreate = () => {
    setEditingCategory(undefined);
    setShowModal(true);
    setIsOpen(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(undefined);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
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
            {filteredCategories && filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 group ${
                    value === cat.name ? "bg-blue-50" : ""
                  }`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cat.name)}
                    className={`flex-1 text-left ${
                      value === cat.name ? "text-blue-700 font-medium" : ""
                    }`}>
                    {cat.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleEdit(e, cat)}
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
        <CategoryModal
          type={type}
          category={editingCategory}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
