"use client";

import { useState, useMemo, useEffect } from "react";
import type { Category } from "@/lib/api/categories";
import { CategoryTree } from "./CategoryTree";

interface CategorySelectorModalProps {
  categories: Category[];
  selectedIds: number[];
  onApply: (selectedIds: number[]) => void;
  onClose: () => void;
}

export function CategorySelectorModal({
  categories,
  selectedIds: initialSelectedIds,
  onApply,
  onClose,
}: CategorySelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState("");

  const getAllChildrenIds = (category: Category): number[] => {
    let ids: number[] = [category.id];
    if (category.children) {
      category.children.forEach((child) => {
        ids = [...ids, ...getAllChildrenIds(child)];
      });
    }
    return ids;
  };

  const getAllCategoryIds = (cats: Category[]): number[] => {
    return cats.reduce((acc, cat) => {
      acc.push(cat.id);
      if (cat.children) {
        acc.push(...getAllCategoryIds(cat.children));
      }
      return acc;
    }, [] as number[]);
  };

  const getParentId = (
    categoryId: number,
    cats: Category[],
    parentId?: number
  ): number | undefined => {
    for (const cat of cats) {
      if (cat.id === categoryId) {
        return parentId;
      }
      if (cat.children) {
        const found = getParentId(categoryId, cat.children, cat.id);
        if (found !== null) return found;
      }
    }
    return undefined;
  };

  const updateParentState = (
    categoryId: number,
    newSelectedIds: number[]
  ): number[] => {
    const parentId = getParentId(categoryId, categories);
    if (!parentId) return newSelectedIds;

    const findCategory = (
      id: number,
      cats: Category[]
    ): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(id, cat.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const parent = findCategory(parentId, categories);
    if (!parent || !parent.children) return newSelectedIds;

    const allChildrenIds = parent.children.flatMap((child) =>
      getAllChildrenIds(child)
    );
    const allChildrenSelected = allChildrenIds.every((id) =>
      newSelectedIds.includes(id)
    );

    let updatedIds = newSelectedIds;
    if (allChildrenSelected && !newSelectedIds.includes(parentId)) {
      updatedIds = [...updatedIds, parentId];
    } else if (!allChildrenSelected && newSelectedIds.includes(parentId)) {
      updatedIds = updatedIds.filter((id) => id !== parentId);
    }

    return updateParentState(parentId, updatedIds);
  };

  const toggleSelect = (categoryId: number) => {
    const findCategory = (
      id: number,
      cats: Category[]
    ): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(id, cat.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const category = findCategory(categoryId, categories);
    if (!category) return;

    const allRelatedIds = getAllChildrenIds(category);
    const isCurrentlySelected = selectedIds.includes(categoryId);

    let newSelectedIds: number[];
    if (isCurrentlySelected) {
      newSelectedIds = selectedIds.filter((id) => !allRelatedIds.includes(id));
    } else {
      newSelectedIds = [...selectedIds, ...allRelatedIds];
    }

    newSelectedIds = updateParentState(categoryId, newSelectedIds);
    setSelectedIds(newSelectedIds);
  };

  const selectAll = () => {
    const allIds = getAllCategoryIds(categories);
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const getIndeterminateIds = (): number[] => {
    const indeterminate: number[] = [];

    const checkIndeterminate = (cat: Category): boolean => {
      if (!cat.children || cat.children.length === 0) {
        return selectedIds.includes(cat.id);
      }

      const childrenStatus = cat.children.map((child) =>
        checkIndeterminate(child)
      );
      const someSelected = childrenStatus.some((status) => status);
      const allSelected = childrenStatus.every((status) => status);

      if (someSelected && !allSelected) {
        indeterminate.push(cat.id);
        return true;
      }

      if (allSelected && !selectedIds.includes(cat.id)) {
        return true;
      }

      return selectedIds.includes(cat.id) || someSelected;
    };

    categories.forEach((cat) => checkIndeterminate(cat));
    return indeterminate;
  };

  const filterCategories = (
    cats: Category[],
    query: string
  ): Category[] | null => {
    if (!query) return cats;

    const filtered: Category[] = [];
    for (const cat of cats) {
      const matchesQuery = cat.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = cat.children
        ? filterCategories(cat.children, query)
        : null;

      if (matchesQuery || (filteredChildren && filteredChildren.length > 0)) {
        filtered.push({
          ...cat,
          children: filteredChildren || cat.children,
        });
      }
    }
    return filtered.length > 0 ? filtered : null;
  };

  const filteredCategories = useMemo(
    () => filterCategories(categories, searchQuery) || [],
    [categories, searchQuery]
  );

  const indeterminateIds = useMemo(
    () => getIndeterminateIds(),
    [selectedIds, categories]
  );

  const handleApply = () => {
    onApply(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[600px] flex flex-col">
        <div className="border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold">Nhóm hàng</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Tìm kiếm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredCategories.length > 0 ? (
            <CategoryTree
              categories={filteredCategories}
              selectedIds={selectedIds}
              indeterminateIds={indeterminateIds}
              onToggleSelect={toggleSelect}
              onEdit={() => {}}
              showEditButton={false}
            />
          ) : (
            <p className="text-center text-gray-500 text-sm py-8">
              Không tìm thấy nhóm hàng
            </p>
          )}
        </div>

        <div className="border-t p-4 flex items-center justify-between">
          <button
            onClick={selectedIds.length > 0 ? deselectAll : selectAll}
            className="text-blue-600 hover:text-blue-700 text-sm">
            {selectedIds.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
