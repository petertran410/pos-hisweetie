"use client";

import { useState, useRef, useEffect } from "react";
import type { Category } from "@/lib/api/categories";

interface CategorySelectProps {
  categories: Category[];
  value?: number;
  onChange: (categoryId: number | undefined) => void;
}

interface FlatCategory {
  id: number;
  name: string;
  level: number;
  hasChildren: boolean;
  parentId?: number;
}

export function CategorySelect({
  categories,
  value,
  onChange,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

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

  const flattenCategories = (
    cats: Category[],
    level: number = 0,
    parentId?: number
  ): FlatCategory[] => {
    return cats.reduce((acc, cat) => {
      acc.push({
        id: cat.id,
        name: cat.name,
        level,
        hasChildren: !!(cat.children && cat.children.length > 0),
        parentId,
      });
      if (cat.children && cat.children.length > 0) {
        acc.push(...flattenCategories(cat.children, level + 1, cat.id));
      }
      return acc;
    }, [] as FlatCategory[]);
  };

  const flatCategories = flattenCategories(categories);

  const findPathToCategory = (categoryId: number): number[] => {
    const path: number[] = [];
    let currentId: number | undefined = categoryId;

    while (currentId !== undefined) {
      path.unshift(currentId);
      const category = flatCategories.find((cat) => cat.id === currentId);
      currentId = category?.parentId;
    }

    return path;
  };

  useEffect(() => {
    if (isOpen && value) {
      const pathToSelected = findPathToCategory(value);
      setExpandedIds(new Set(pathToSelected));

      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } else if (isOpen) {
      setExpandedIds(new Set());
    }
  }, [isOpen, value]);

  const selectedCategory = flatCategories.find((cat) => cat.id === value);

  const getVisibleCategories = () => {
    if (searchQuery) {
      return flatCategories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const visible: FlatCategory[] = [];
    for (const cat of flatCategories) {
      if (cat.level === 0) {
        visible.push(cat);
      } else {
        const parentId = cat.parentId;
        if (parentId && expandedIds.has(parentId)) {
          visible.push(cat);
        }
      }
    }
    return visible;
  };

  const visibleCategories = getVisibleCategories();

  const toggleExpand = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (expandedIds.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const handleSelect = (categoryId: number) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const renderCategoryItem = (cat: FlatCategory) => {
    const isSelected = value === cat.id;
    const isExpanded = expandedIds.has(cat.id);

    return (
      <div key={cat.id} className="relative">
        <button
          ref={isSelected ? selectedItemRef : null}
          type="button"
          onClick={() => handleSelect(cat.id)}
          className={`
          w-full text-left px-3 py-2 hover:bg-blue-50 text-sm transition-colors
          flex items-center gap-2
          ${isSelected ? "bg-blue-100 text-blue-700 font-medium" : ""}
          ${cat.level === 0 ? "font-semibold text-gray-900" : "text-gray-700"}
        `}
          style={{ paddingLeft: `${cat.level * 20 + 12}px` }}>
          {cat.hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(cat.id, e);
              }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded transition-colors cursor-pointer">
              <svg
                className={`w-3 h-3 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          )}
          {!cat.hasChildren && cat.level > 0 && (
            <span className="w-4 flex-shrink-0" />
          )}
          <span className="flex-1 truncate">{cat.name}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
        <span className={selectedCategory ? "text-gray-900" : "text-gray-500"}>
          {selectedCategory ? selectedCategory.name : "Chọn nhóm hàng"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
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
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-hidden z-50">
          <div className="sticky top-0 bg-white border-b p-2">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto max-h-64">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
                setSearchQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-500 border-b">
              -- Không chọn nhóm hàng --
            </button>

            {visibleCategories.length > 0 ? (
              visibleCategories.map((cat) => renderCategoryItem(cat))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                Không tìm thấy nhóm hàng
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
