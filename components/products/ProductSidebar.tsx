"use client";

import { useState } from "react";
import {
  useRootCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories";
import { CategoryModal } from "./CategoryModal";
import { CategorySelectorModal } from "./CategorySelectorModal";
import type { Category } from "@/lib/api/categories";

interface ProductSidebarProps {
  selectedCategoryIds: number[];
  onSelectedCategoryIdsChange: (ids: number[]) => void;
}

export function ProductSidebar({
  selectedCategoryIds,
  onSelectedCategoryIdsChange,
}: ProductSidebarProps) {
  const { data: categories } = useRootCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    Category | undefined
  >();

  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setShowCategoryModal(true);
  };

  const handleSubmitCategory = (data: any) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data },
        {
          onSuccess: () => {
            setShowCategoryModal(false);
            setEditingCategory(undefined);
          },
        }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => {
          setShowCategoryModal(false);
        },
      });
    }
  };

  const flattenCategories = (cats: Category[]): Category[] => {
    return cats.reduce((acc, cat) => {
      acc.push(cat);
      if (cat.children) {
        acc.push(...flattenCategories(cat.children));
      }
      return acc;
    }, [] as Category[]);
  };

  const getSelectedCategoryNames = () => {
    if (!categories || selectedCategoryIds.length === 0) return "";
    const allCategories = flattenCategories(categories);
    const selectedNames = selectedCategoryIds
      .map((id) => allCategories.find((cat) => cat.id === id)?.name)
      .filter(Boolean);
    if (selectedNames.length === 0) return "";
    if (selectedNames.length === 1) return selectedNames[0];
    return `${selectedNames.length} nhóm đã chọn`;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Nhóm hàng</h3>
          <button
            onClick={handleCreateCategory}
            className="text-blue-600 hover:text-blue-700 text-sm">
            Tạo mới
          </button>
        </div>

        <button
          onClick={() => setShowCategorySelector(true)}
          className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
          <span className="text-sm text-gray-600">
            {getSelectedCategoryNames() || "Chọn nhóm hàng"}
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
      </div>

      <div>
        <h3 className="font-semibold mb-2">Tồn kho</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
          <option value="lowstock">Dưới định mức</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Kho hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả kho</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Dự kiến hết hàng</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="stock-time" value="all" defaultChecked />
            <span>Toàn thời gian</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="stock-time" value="custom" />
            <span>Tùy chỉnh</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Thời gian tạo</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="create-time" value="all" defaultChecked />
            <span>Toàn thời gian</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="create-time" value="custom" />
            <span>Tùy chỉnh</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Thuộc tính</h3>
        <input
          type="text"
          placeholder="Ví dụ: Màu sắc, Kích cỡ..."
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Nhà cung cấp</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn nhà cung cấp</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Thương hiệu</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn thương hiệu</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Loại hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn loại hàng</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Bán trực tiếp</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="all" defaultChecked />
            <span>Tất cả</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="yes" />
            <span>Có</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direct-sale" value="no" />
            <span>Không</span>
          </label>
        </div>
      </div>

      {showCategorySelector && categories && (
        <CategorySelectorModal
          categories={categories}
          selectedIds={selectedCategoryIds}
          onApply={onSelectedCategoryIdsChange}
          onClose={() => setShowCategorySelector(false)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories ? flattenCategories(categories) : []}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(undefined);
          }}
          onSubmit={handleSubmitCategory}
        />
      )}
    </div>
  );
}
