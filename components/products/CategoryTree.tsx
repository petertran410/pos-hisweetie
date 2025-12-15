"use client";

import { useState, useRef, useEffect } from "react";
import type { Category } from "@/lib/api/categories";

interface CategoryTreeProps {
  categories: Category[];
  selectedIds: number[];
  indeterminateIds?: number[];
  onToggleSelect: (id: number) => void;
  onEdit: (category: Category) => void;
  showEditButton?: boolean;
}

export function CategoryTree({
  categories,
  selectedIds,
  indeterminateIds = [],
  onToggleSelect,
  onEdit,
  showEditButton = true,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const checkboxRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    Object.entries(checkboxRefs.current).forEach(([id, checkbox]) => {
      if (checkbox) {
        const numericId = parseInt(id);
        checkbox.indeterminate = indeterminateIds.includes(numericId);
      }
    });
  }, [indeterminateIds]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedIds.includes(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const productCount = category._count?.products || 0;
    const isSelected = selectedIds.includes(category.id);
    const isIndeterminate = indeterminateIds.includes(category.id);

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-1.5 hover:bg-gray-50 group rounded"
          style={{ paddingLeft: `${level * 20 + 8}px` }}>
          {level > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
              style={{ left: `${level * 20}px` }}
            />
          )}

          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700">
                {isExpanded ? "▼" : "▶"}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <input
              ref={(el) => {
                checkboxRefs.current[category.id] = el;
              }}
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(category.id)}
              className="cursor-pointer"
            />

            <span className="flex-1 text-sm cursor-pointer">
              {category.name}
              {productCount > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({productCount})
                </span>
              )}
            </span>

            {showEditButton && (
              <button
                onClick={() => onEdit(category)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                title="Sửa nhóm hàng">
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
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) =>
              renderCategory(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {categories.map((category) => renderCategory(category))}
    </div>
  );
}
