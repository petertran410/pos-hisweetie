"use client";

import { useForm } from "react-hook-form";
import { CategoryType } from "@/lib/api/categories";
import { useCreateCategory } from "@/lib/hooks/useCategories";

interface CreateCategoryModalProps {
  type: CategoryType;
  onClose: () => void;
}

const TYPE_LABELS: Record<CategoryType, string> = {
  parent: "Loại Hàng",
  middle: "Nguồn Gốc",
  child: "Danh Mục",
};

export function CreateCategoryModal({
  type,
  onClose,
}: CreateCategoryModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const createCategory = useCreateCategory();

  const onSubmit = async (data: any) => {
    await createCategory.mutateAsync({
      name: data.name,
      type,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Tạo {TYPE_LABELS[type]}</h3>
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Tạo mới
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
