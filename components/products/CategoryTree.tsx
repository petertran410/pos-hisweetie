"use client";

import { useState } from "react";
import type { Category } from "@/lib/api/categories";

interface CategoryTreeProps {
  categories: Category[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onEdit: (category: Category) => void;
}

export function CategoryTree({
  categories,
  selectedIds,
  onToggleSelect,
  onEdit,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedIds.includes(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-1 hover:bg-gray-50"
          style={{ paddingLeft: `${level * 20}px` }}>
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <input
            type="checkbox"
            checked={selectedIds.includes(category.id)}
            onChange={() => onToggleSelect(category.id)}
            className="cursor-pointer"
          />

          <span
            onClick={() => onEdit(category)}
            className="flex-1 cursor-pointer text-sm">
            {category.name}
          </span>
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
    <div className="space-y-1">
      {categories.map((category) => renderCategory(category))}
    </div>
  );
}
