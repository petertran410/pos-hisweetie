"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CategoryType, Category } from "@/lib/api/categories";
import {
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories";

interface CategoryModalProps {
  type: CategoryType;
  category?: Category;
  onClose: () => void;
}

const TYPE_LABELS: Record<CategoryType, string> = {
  parent: "Loại Hàng",
  middle: "Nguồn Gốc",
  child: "Danh Mục",
};

export function CategoryModal({ type, category, onClose }: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      name: category?.name || "",
    },
  });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  useEffect(() => {
    if (category) {
      setValue("name", category.name);
    }
  }, [category, setValue]);

  const onSubmit = async (data: any) => {
    if (category) {
      await updateCategory.mutateAsync({
        id: category.id,
        data: {
          name: data.name,
          type,
        },
      });
    } else {
      await createCategory.mutateAsync({
        name: data.name,
        type,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {category ? "Chỉnh sửa" : "Tạo"} {TYPE_LABELS[type]}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: "Vui lòng nhập tên" })}
              className="w-full border rounded px-3 py-2"
              placeholder={`Nhập tên ${TYPE_LABELS[type]}`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={createCategory.isPending || updateCategory.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {createCategory.isPending || updateCategory.isPending
                ? "Đang lưu..."
                : category
                ? "Cập nhật"
                : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
