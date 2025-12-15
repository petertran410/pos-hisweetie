"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Category } from "@/lib/api/categories";

interface CategoryModalProps {
  category?: Category;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function CategoryModal({
  category,
  categories,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const [showParentSelector, setShowParentSelector] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>(
    category?.parentId
  );

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      name: category?.name || "",
      parentId: category?.parentId || undefined,
    },
  });

  const findCategoryById = (
    cats: Category[],
    id: number
  ): Category | undefined => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedParent = selectedParentId
    ? findCategoryById(categories, selectedParentId)
    : null;

  const handleParentSelect = (id: number | undefined) => {
    setSelectedParentId(id);
    setValue("parentId", id);
    setShowParentSelector(false);
  };

  const renderCategoryOption = (cat: Category, level: number = 0) => {
    if (category && cat.id === category.id) return null;

    const indent = "　".repeat(level);
    const productCount = cat._count?.products || 0;

    return (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => handleParentSelect(cat.id)}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
          style={{ paddingLeft: `${level * 20 + 16}px` }}>
          {indent}
          {cat.name}
          {productCount > 0 && (
            <span className="text-xs text-gray-500 ml-2">({productCount})</span>
          )}
        </button>
        {cat.children &&
          cat.children.map((child) => renderCategoryOption(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {category ? "Sửa nhóm hàng" : "Tạo nhóm hàng"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: true })}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập tên nhóm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nhóm cha</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowParentSelector(!showParentSelector)}
                className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
                <span className="text-sm">
                  {selectedParent ? selectedParent.name : "Chọn nhóm hàng"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400"
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

              {showParentSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-10">
                  <button
                    type="button"
                    onClick={() => handleParentSelect(undefined)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-b">
                    -- Không có nhóm cha --
                  </button>

                  <div className="py-2">
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      className="w-full px-4 py-2 border-b focus:outline-none text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <div className="py-1">
                      <p className="px-4 py-1 text-xs font-semibold text-gray-500">
                        Chọn nhóm hàng
                      </p>
                      {categories.map((cat) => renderCategoryOption(cat))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {category ? "Lưu" : "Áp dụng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
