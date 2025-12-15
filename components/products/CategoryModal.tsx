"use client";

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
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: category?.name || "",
      parentId: category?.parentId || undefined,
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
            <select
              {...register("parentId")}
              className="w-full border rounded px-3 py-2">
              <option value="">Chọn nhóm hàng</option>
              {categories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
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
