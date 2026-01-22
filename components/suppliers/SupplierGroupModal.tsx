"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateSupplierGroup,
  useUpdateSupplierGroup,
} from "@/lib/hooks/useSuppliers";
import { SupplierGroup } from "@/lib/types/supplier";

interface SupplierGroupModalProps {
  group?: SupplierGroup;
  onClose: () => void;
}

export function SupplierGroupModal({
  group,
  onClose,
}: SupplierGroupModalProps) {
  const createGroup = useCreateSupplierGroup();
  const updateGroup = useUpdateSupplierGroup();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: group?.name || "",
      description: group?.description || "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (group) {
        await updateGroup.mutateAsync({ id: group.id, data });
      } else {
        await createGroup.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Error saving group:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {group ? "Sửa nhóm nhà cung cấp" : "Thêm nhóm nhà cung cấp"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: true })}
              placeholder="Nhập tên nhóm"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              {...register("description")}
              placeholder="Nhập ghi chú"
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={isSubmitting}>
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
