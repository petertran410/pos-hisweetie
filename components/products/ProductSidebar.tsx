"use client";

import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories";
import type { Category } from "@/lib/api/categories";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { CategoryDropdown } from "./CategoryDropdown";

interface ProductSidebarProps {
  selectedParentName?: string;
  selectedMiddleName?: string;
  selectedChildName?: string;
  onSelectedParentNameChange: (name: string | undefined) => void;
  onSelectedMiddleNameChange: (name: string | undefined) => void;
  onSelectedChildNameChange: (name: string | undefined) => void;
}

export function ProductSidebar({
  selectedParentName,
  selectedMiddleName,
  selectedChildName,
  onSelectedParentNameChange,
  onSelectedMiddleNameChange,
  onSelectedChildNameChange,
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
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 bg-white shadow-xl">
      <div className="mb-5">
        <CategoryDropdown
          type="parent"
          label="Loại Hàng"
          placeholder="Chọn Loại Hàng"
          value={selectedParentName}
          onChange={onSelectedParentNameChange}
        />
      </div>

      <div className="mb-5">
        <CategoryDropdown
          type="middle"
          label="Nguồn Gốc"
          placeholder="Chọn Nguồn Gốc"
          value={selectedMiddleName}
          onChange={onSelectedMiddleNameChange}
        />
      </div>

      <div className="mb-5">
        <CategoryDropdown
          type="child"
          label="Danh Mục"
          placeholder="Chọn Danh Mục"
          value={selectedChildName}
          onChange={onSelectedChildNameChange}
        />
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Tồn kho</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
          <option value="lowstock">Dưới định mức</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Kho hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Tất cả kho</option>
        </select>
      </div>

      <div className="mb-5">
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

      <div className="mb-5">
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

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Thuộc tính</h3>
        <input
          type="text"
          placeholder="Ví dụ: Màu sắc, Kích cỡ..."
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Nhà cung cấp</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn nhà cung cấp</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Thương hiệu</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn thương hiệu</option>
        </select>
      </div>

      <div className="mb-5">
        <h3 className="font-semibold mb-2">Loại hàng</h3>
        <select className="w-full border rounded px-3 py-2">
          <option value="">Chọn loại hàng</option>
        </select>
      </div>

      <div className="mb-5">
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
