"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TradeMark } from "@/lib/api/trademarks";
import {
  useCreateTrademark,
  useUpdateTrademark,
} from "@/lib/hooks/useTrademarks";

interface TrademarkModalProps {
  trademark?: TradeMark;
  onClose: () => void;
}

export function TrademarkModal({ trademark, onClose }: TrademarkModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      name: trademark?.name || "",
      description: trademark?.description || "",
    },
  });

  const createTrademark = useCreateTrademark();
  const updateTrademark = useUpdateTrademark();

  useEffect(() => {
    if (trademark) {
      setValue("name", trademark.name);
    }
  }, [trademark, setValue]);

  const onSubmit = async (data: any) => {
    if (trademark) {
      await updateTrademark.mutateAsync({
        id: trademark.id,
        data,
      });
    } else {
      await createTrademark.mutateAsync(data);
    }
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {trademark ? "Chỉnh sửa" : "Tạo"} Thương Hiệu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: "Vui lòng nhập tên" })}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập tên thương hiệu"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFormSubmit(e as any);
                }
              }}
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
              type="button"
              onClick={handleFormSubmit}
              disabled={createTrademark.isPending || updateTrademark.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {createTrademark.isPending || updateTrademark.isPending
                ? "Đang lưu..."
                : trademark
                ? "Cập nhật"
                : "Tạo mới"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
