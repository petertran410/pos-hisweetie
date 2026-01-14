"use client";

import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories";
import type { Category } from "@/lib/api/categories";
import { CreateCategoryModal } from "./CreateCategoryModal";

interface ProductSidebarProps {
  selectedParentNames: string[];
  selectedMiddleNames: string[];
  selectedChildNames: string[];
  onSelectedParentNamesChange: (names: string[]) => void;
  onSelectedMiddleNamesChange: (names: string[]) => void;
  onSelectedChildNamesChange: (names: string[]) => void;
}

export function ProductSidebar({
  selectedParentNames,
  selectedMiddleNames,
  selectedChildNames,
  onSelectedParentNamesChange,
  onSelectedMiddleNamesChange,
  onSelectedChildNamesChange,
}: ProductSidebarProps) {
  const [showCreateParentModal, setShowCreateParentModal] = useState(false);
  const [showCreateMiddleModal, setShowCreateMiddleModal] = useState(false);
  const [showCreateChildModal, setShowCreateChildModal] = useState(false);

  const { data: parentCategories } = useCategories("parent");
  const { data: middleCategories } = useCategories("middle");
  const { data: childCategories } = useCategories("child");

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

  // const flattenCategories = (cats: Category[]): Category[] => {
  //   return cats.reduce((acc, cat) => {
  //     acc.push(cat);
  //     if (cat.children) {
  //       acc.push(...flattenCategories(cat.children));
  //     }
  //     return acc;
  //   }, [] as Category[]);
  // };

  // const getSelectedCategoryNames = () => {
  //   if (!categories || selectedCategoryIds.length === 0) return "";
  //   const allCategories = flattenCategories(categories);
  //   const selectedNames = selectedCategoryIds
  //     .map((id) => allCategories.find((cat) => cat.id === id)?.name)
  //     .filter(Boolean);
  //   if (selectedNames.length === 0) return "";
  //   if (selectedNames.length === 1) return selectedNames[0];
  //   return `${selectedNames.length} nhóm đã chọn`;
  // };

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Loại Hàng</h3>
          <button
            onClick={() => setShowCreateParentModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm">
            Tạo mới
          </button>
        </div>
        <select
          multiple
          value={selectedParentNames}
          onChange={(e) => {
            const selected = Array.from(
              e.target.selectedOptions,
              (option) => option.value
            );
            onSelectedParentNamesChange(selected);
          }}
          className="w-full border rounded px-3 py-2 min-h-[100px]">
          {parentCategories?.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Nguồn Gốc</h3>
          <button
            onClick={() => setShowCreateMiddleModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm">
            Tạo mới
          </button>
        </div>
        <select
          multiple
          value={selectedMiddleNames}
          onChange={(e) => {
            const selected = Array.from(
              e.target.selectedOptions,
              (option) => option.value
            );
            onSelectedMiddleNamesChange(selected);
          }}
          className="w-full border rounded px-3 py-2 min-h-[100px]">
          {middleCategories?.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Danh Mục</h3>
          <button
            onClick={() => setShowCreateChildModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm">
            Tạo mới
          </button>
        </div>
        <select
          multiple
          value={selectedChildNames}
          onChange={(e) => {
            const selected = Array.from(
              e.target.selectedOptions,
              (option) => option.value
            );
            onSelectedChildNamesChange(selected);
          }}
          className="w-full border rounded px-3 py-2 min-h-[100px]">
          {childCategories?.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
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

      {showCreateParentModal && (
        <CreateCategoryModal
          type="parent"
          onClose={() => setShowCreateParentModal(false)}
        />
      )}

      {showCreateMiddleModal && (
        <CreateCategoryModal
          type="middle"
          onClose={() => setShowCreateMiddleModal(false)}
        />
      )}

      {showCreateChildModal && (
        <CreateCategoryModal
          type="child"
          onClose={() => setShowCreateChildModal(false)}
        />
      )}
    </div>
  );
}
